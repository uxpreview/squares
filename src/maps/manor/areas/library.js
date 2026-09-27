// Library: the hero and the crime scene. Two storeys of books with a gallery
// round the top, a fire, a tall window onto the storm, and in the middle Lord
// Gooseworth, 80 today, face down in his own birthday trifle. A stuffed bear
// towers over him, and Inspector Pidge (on the evening's clock) interrogates it.
import {
  C, Q, SKIN, box, rect, disc, face, paint, shade, tint, mix, alpha, hash, rng, slab, planks,
} from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { INK, MAT, ROOM, CAST, MIDNIGHT, house, storm, pastK, fire, candle, lamp, drawCast, webPrint } from '../style.js';
import { DOORS } from '../plan.js';

const RM = ROOM.library;
const CAST_SKIN = CAST.lord.look.skin;
const H = 13.1; // two storeys: the only room in the house this tall
const GAL = 7.1; // the gallery's floor, level with the upstairs rooms
const CASE = 1.1; // how far the bookcases stand out from the walls
const SPINE = 0.98; // where the books' spines are, out from the wall

// ---------- Drawing on the back walls ----------
// A point on a plane parallel to a back wall, d out from it, to the screen.
// side 'left' is the wall x = 0 (u runs along y), 'right' the wall y = 0 (u along x).
const SP = (side, u, d, z) => (side === 'left' ? [d - u, (d + u) / 2 - z * ZK] : [u - d, (u + d) / 2 - z * ZK]);

// Draw flat on such a plane: (0, 0) sits at u along the wall and height z, x
// runs along the wall the way text reads, y runs down.
function onPlane(ctx, side, u, d, z, draw) {
  ctx.save();
  if (side === 'left') ctx.transform(1, -0.5, 0, ZK, d - u, (d + u) / 2 - z * ZK);
  else ctx.transform(1, 0.5, 0, ZK, u - d, (u + d) / 2 - z * ZK);
  draw(ctx);
  ctx.restore();
}

// Text on such a plane, centered on (u, z).
function planeText(ctx, side, u, d, z, text, size, color, font = 'Bagel Fat One') {
  onPlane(ctx, side, u, d, z, (g) => {
    const k = 40;
    g.scale(1 / k, 1 / k);
    g.font = `${size * k}px "${font}", "Arial Black", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, 0, 0);
  });
}

// Add a quad (four [X, Y] screen points) to the current path.
function quad(ctx, a, b, c, d) {
  ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
  ctx.closePath();
}

// ---------- The bookcases ----------
// Book rows: [bottom, top]. Two storeys of them; the gallery hides the band
// between 5.6 and 7.1, so no books are drawn there.
const ROWS = [
  [0.35, 1.15], [1.15, 1.95], [1.95, 2.75], [2.75, 3.55], [3.55, 4.35], [4.35, 5.15], [5.15, 5.95],
  [GAL, 7.9], [7.9, 8.7], [8.7, 9.5], [9.5, 10.3], [10.3, 11.1], [11.1, 11.9],
];
const TOP = 11.9;
const SPINES = [
  INK.oxblood, INK.verdigris, INK.candleGold, INK.bone, INK.deepPlum, INK.stormNavy,
  MAT.velvetDark, MAT.brassDark, MAT.leafDark, mix(INK.bone, INK.candleGold, 0.45),
];
const PAGES = mix(INK.bone, RM.trim, 0.3);

// Lay a bookcase out once (it's drawn many times): which books stand where,
// in which color. u0..u1 along the wall. o.special: { 'row,bay': kind } for
// shelves that hold something other than books.
function makeCase(side, u0, u1, seed, o = {}) {
  const r = rng(seed);
  const inner0 = u0 + 0.1, inner1 = u1 - 0.1;
  const nb = Math.max(1, Math.round((inner1 - inner0) / 1.75));
  const bw = (inner1 - inner0 - (nb - 1) * 0.08) / nb;
  const bays = [];
  for (let i = 0; i < nb; i++) bays.push([inner0 + i * (bw + 0.08), inner0 + i * (bw + 0.08) + bw]);
  const rows = ROWS.map(([z0, z1], ri) => {
    const colors = new Map();
    const sides = [];
    const tops = [];
    const bands = [];
    const extras = [];
    bays.forEach(([a0, a1], bi) => {
      const sp = o.special && o.special[`${ri},${bi}`];
      if (sp === 'empty') { extras.push({ kind: 'empty', a0, a1, z0 }); return; }
      let a = a0 + 0.02;
      let prev = null;
      const room = z1 - z0 - 0.12;
      while (a < a1 - 0.12) {
        const roll = r();
        if (sp && !extras.some((e) => e.row === ri && e.bay === bi) && a > (a0 + a1) / 2 - 0.4) {
          // Something else on this shelf, in the middle of the bay.
          extras.push({ kind: sp, row: ri, bay: bi, u: a + 0.35, z0 });
          if (prev) prev.next = 0;
          a += 0.7;
          prev = null;
          continue;
        }
        if (roll < 0.05 && a < a1 - 0.7) {
          // A lying stack of three or four books.
          const n = 3 + Math.floor(r() * 2);
          extras.push({ kind: 'stack', u: a, w: 0.5, z0, n, c: Math.floor(r() * SPINES.length) });
          if (prev) prev.next = 0;
          a += 0.56;
          prev = null;
          continue;
        }
        if (roll < 0.1) {
          // A gap.
          if (prev) prev.next = 0;
          a += 0.18 + r() * 0.3;
          prev = null;
          continue;
        }
        const w = Math.min(0.1 + r() * 0.13, a1 - a);
        const h = room * (0.6 + r() * 0.38);
        const c = Math.floor(r() * SPINES.length);
        const b = { a, w, h, c };
        if (prev) prev.next = h;
        prev = b;
        const zt = z0 + h;
        const q = [SP(side, a, SPINE, z0), SP(side, a + w, SPINE, z0), SP(side, a + w, SPINE, zt), SP(side, a, SPINE, zt)];
        if (!colors.has(c)) colors.set(c, []);
        colors.get(c).push(q);
        tops.push([SP(side, a, SPINE - 0.7, zt), SP(side, a + w, SPINE - 0.7, zt), SP(side, a + w, SPINE, zt), SP(side, a, SPINE, zt)]);
        // Gold tooling across the spine, top and bottom.
        if (r() < 0.6) bands.push([SP(side, a, SPINE, zt - 0.1), SP(side, a + w, SPINE, zt - 0.1)], [SP(side, a, SPINE, z0 + 0.1), SP(side, a + w, SPINE, z0 + 0.1)]);
        b.side = (next) => {
          const zn = z0 + Math.min(next, h);
          return [SP(side, a + w, SPINE - 0.7, zn), SP(side, a + w, SPINE, zn), SP(side, a + w, SPINE, zt), SP(side, a + w, SPINE - 0.7, zt)];
        };
        sides.push(b);
        a += w + 0.005;
      }
      if (prev) prev.next = 0;
      prev = null;
    });
    return {
      z0, z1, colors, tops, bands, extras,
      sides: sides.filter((b) => (b.next ?? 0) < b.h - 0.02).map((b) => b.side(b.next ?? 0)),
    };
  });
  return { side, u0, u1, bays, rows, labels: o.labels || [] };
}

// A box against a back wall in (u, d, z) terms.
function wbox(ctx, side, u, d, z, w, dd, h, color, o) {
  if (side === 'left') box(ctx, d, u, z, dd, w, h, color, o);
  else box(ctx, u, d, z, w, dd, h, color, o);
}
// A flat quad on a plane d out from the wall.
function wface(ctx, side, u, d, z, w, h, fill, o) {
  ctx.beginPath();
  quad(ctx, SP(side, u, d, z), SP(side, u + w, d, z), SP(side, u + w, d, z + h), SP(side, u, d, z + h));
  paint(ctx, fill, o);
}

function drawCase(ctx, c) {
  const { side, u0, u1 } = c;
  const wood = RM.trim;
  const back = shade(wood, 0.45);
  // The inside back, dark, then the far end panel.
  wface(ctx, side, u0, 0.02, 0.35, u1 - u0, TOP - 0.35, back, { stroke: false });
  if (!Q.detail) {
    // Far out: rows of color, no single books.
    for (const row of c.rows) {
      wface(ctx, side, u0 + 0.1, SPINE, row.z0, u1 - u0 - 0.2, (row.z1 - row.z0) * 0.72, mix(INK.oxblood, INK.candleGold, 0.25), { stroke: false });
      wbox(ctx, side, u0, 0, row.z0 - 0.08, u1 - u0, CASE, 0.08, wood, { flat: true, stroke: false });
    }
  } else {
    for (const row of c.rows) {
      // The shelf the row stands on.
      wbox(ctx, side, u0, 0, row.z0 - 0.08, u1 - u0, CASE, 0.08, wood, { flat: true, lw: 0.03 });
      ctx.beginPath();
      for (const q of row.tops) quad(ctx, ...q);
      ctx.fillStyle = PAGES;
      ctx.fill();
      if (row.sides.length) {
        ctx.beginPath();
        for (const q of row.sides) quad(ctx, ...q);
        ctx.fillStyle = shade(INK.oxblood, 0.45);
        ctx.fill();
      }
      for (const [ci, list] of row.colors) {
        ctx.beginPath();
        for (const q of list) quad(ctx, ...q);
        ctx.fillStyle = SPINES[ci];
        ctx.fill();
      }
      if (Q.lines) {
        ctx.beginPath();
        for (const list of row.colors.values()) for (const q of list) quad(ctx, ...q);
        ctx.strokeStyle = alpha(C.ink, 0.75);
        ctx.lineWidth = 0.022;
        ctx.stroke();
        if (row.bands.length) {
          ctx.beginPath();
          for (const [a, b] of row.bands) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
          ctx.strokeStyle = alpha(INK.candleGold, 0.8);
          ctx.lineWidth = 0.02;
          ctx.stroke();
        }
      }
      for (const e of row.extras) shelfThing(ctx, side, e);
    }
  }
  // Uprights between the bays, the top, the near end panel and the plinth.
  for (let i = 1; i < c.bays.length; i++) wface(ctx, side, c.bays[i][0] - 0.08, CASE, 0.35, 0.08, TOP - 0.35, wood, { lw: 0.03 });
  wbox(ctx, side, u0, 0, TOP, u1 - u0, CASE, 0.12, wood, { flat: true, lw: 0.03 });
  wbox(ctx, side, u0 - 0.1, 0, TOP + 0.12, u1 - u0 + 0.2, CASE + 0.15, 0.3, shade(wood, 0.1), { flat: true, lw: 0.04 });
  wface(ctx, side, u0, CASE, 0, 0.1, TOP, wood, { lw: 0.03 });
  wbox(ctx, side, u1 - 0.1, 0, 0, 0.1, CASE, TOP, wood, { flat: true, lw: 0.03 });
  wbox(ctx, side, u0, 0, 0, u1 - u0, CASE, 0.35, shade(wood, 0.15), { flat: true, lw: 0.03 });
  for (const [ri, bi, text] of c.labels) {
    const [a0, a1] = c.bays[bi];
    const z = ROWS[ri][0];
    wface(ctx, side, (a0 + a1) / 2 - 0.42, CASE + 0.01, z + 0.02, 0.84, 0.2, MAT.brass, { lw: 0.02 });
    if (Q.detail) planeText(ctx, side, (a0 + a1) / 2, CASE + 0.02, z + 0.12, text, 0.13, C.ink);
  }
}

// Something on a shelf that isn't a row of books.
function shelfThing(ctx, side, e) {
  if (e.kind === 'stack') {
    for (let i = 0; i < e.n; i++) {
      const col = SPINES[(e.c + i * 3) % SPINES.length];
      wbox(ctx, side, e.u + (i % 2) * 0.04, SPINE - 0.62, e.z0 + i * 0.09, e.w - 0.06, 0.6, 0.09, col, { flat: true, lw: 0.02, top: PAGES });
    }
    return;
  }
  if (e.kind === 'empty') {
    // A cobweb across the empty shelf.
    if (!Q.lines) return;
    ctx.beginPath();
    const a = SP(side, e.a0 + 0.05, SPINE, e.z0 + 0.62), m = SP(side, e.a0 + 0.3, SPINE, e.z0 + 0.35);
    ctx.moveTo(a[0], a[1]);
    for (const [du, dz] of [[0.45, 0.66], [0.05, 0.1], [0.4, 0.2]]) {
      const b = SP(side, e.a0 + du, SPINE, e.z0 + dz);
      ctx.moveTo(m[0], m[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.moveTo(m[0], m[1]); ctx.lineTo(a[0], a[1]);
    ctx.strokeStyle = alpha(INK.bone, 0.5);
    ctx.lineWidth = 0.015;
    ctx.stroke();
    return;
  }
  const [X, Y] = SP(side, e.u, SPINE - 0.35, e.z0);
  ctx.save();
  ctx.translate(X, Y);
  if (e.kind === 'skull') {
    ctx.beginPath();
    ctx.arc(0, -0.22, 0.17, Math.PI * 0.9, Math.PI * 2.1);
    ctx.lineTo(0.1, -0.02); ctx.lineTo(-0.1, -0.02);
    ctx.closePath();
    paint(ctx, INK.bone, { lw: 0.02 });
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(-0.06, -0.2, 0.04, 0, Math.PI * 2);
    ctx.arc(0.06, -0.2, 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'eyes') {
    // A jar of spare glass eyes. The Lord stuffed everything.
    ctx.beginPath();
    ctx.roundRect(-0.16, -0.46, 0.32, 0.46, 0.06);
    paint(ctx, alpha(MAT.glass, 0.6), { lw: 0.02 });
    for (let i = 0; i < 5; i++) {
      const ex = -0.09 + (i % 3) * 0.09, ey = -0.1 - Math.floor(i / 3) * 0.1 - (i % 2) * 0.03;
      ctx.beginPath();
      ctx.arc(ex, ey, 0.045, 0, Math.PI * 2);
      ctx.fillStyle = INK.bone;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + 0.012, ey, 0.02, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }
    ctx.fillStyle = MAT.brass;
    ctx.fillRect(-0.17, -0.5, 0.34, 0.07);
  } else if (e.kind === 'bird') {
    // A small stuffed bird on a twig.
    ctx.fillStyle = MAT.oak;
    ctx.fillRect(-0.2, -0.08, 0.4, 0.05);
    ctx.beginPath();
    ctx.ellipse(0, -0.22, 0.16, 0.11, -0.3, 0, Math.PI * 2);
    ctx.moveTo(0.18, -0.3); ctx.arc(0.13, -0.32, 0.07, 0, Math.PI * 2);
    paint(ctx, INK.verdigris, { lw: 0.02 });
    ctx.beginPath();
    ctx.moveTo(0.19, -0.33); ctx.lineTo(0.27, -0.31); ctx.lineTo(0.19, -0.29);
    ctx.fillStyle = INK.candleGold;
    ctx.fill();
  } else if (e.kind === 'urn') {
    ctx.beginPath();
    ctx.moveTo(-0.08, 0); ctx.lineTo(0.08, 0); ctx.lineTo(0.05, -0.08);
    ctx.quadraticCurveTo(0.2, -0.2, 0.08, -0.42); ctx.lineTo(-0.08, -0.42);
    ctx.quadraticCurveTo(-0.2, -0.2, -0.05, -0.08);
    ctx.closePath();
    paint(ctx, INK.verdigris, { lw: 0.02, dots: shade(INK.verdigris, 0.4), density: 0.2 });
  }
  ctx.restore();
}

// ---------- The fireplace ----------
const FIRE = { u0: 5.0, u1: 8.4, d: 0.9, h: 2.6, o0: 5.75, o1: 7.65, oh: 1.7 }; // on the left wall

// The opening in the fireplace's front, as a path in the front's plane.
function openingPath(g) {
  const w = FIRE.o1 - FIRE.o0;
  g.beginPath();
  g.moveTo(0, -0.12);
  g.lineTo(0, -FIRE.oh + 0.25);
  g.quadraticCurveTo(w / 2, -FIRE.oh - 0.15, w, -FIRE.oh + 0.25);
  g.lineTo(w, -0.12);
  g.closePath();
}

function fireplace(ctx) {
  const { u0, u1, d, h } = FIRE;
  box(ctx, 0, u0, 0, d, u1 - u0, h, MAT.marble, { dotsL: MAT.marbleVein, dens: 0.12 });
  // Marble veins, and the opening.
  onPlane(ctx, 'left', u1, d, 0, (g) => {
    if (Q.detail) {
      g.beginPath();
      g.moveTo(0.3, -2.3); g.quadraticCurveTo(0.9, -2.0, 1.1, -2.45);
      g.moveTo(2.4, -2.2); g.quadraticCurveTo(2.8, -1.9, 3.2, -2.35);
      g.moveTo(0.2, -1.2); g.quadraticCurveTo(0.45, -0.8, 0.3, -0.4);
      g.moveTo(3.15, -1.4); g.quadraticCurveTo(2.95, -0.9, 3.2, -0.5);
      g.strokeStyle = MAT.marbleVein;
      g.lineWidth = 0.025;
      g.stroke();
    }
    g.translate(u1 - FIRE.o1, 0);
    openingPath(g);
    paint(g, mix(C.black, INK.stormNavy, 0.3), { lw: 0.04 });
  });
  // Mantel shelf, with a carved edge.
  box(ctx, 0, u0 - 0.2, h, d + 0.28, u1 - u0 + 0.4, 0.18, MAT.marble, { top: tint(MAT.marble, 0.2) });
  box(ctx, 0, u0 - 0.1, h - 0.14, d + 0.12, u1 - u0 + 0.2, 0.14, MAT.marbleVein, { flat: true, lw: 0.03 });
  // The hearth.
  box(ctx, d, u0 - 0.15, 0, 1.0, u1 - u0 + 0.3, 0.07, MAT.stone, { top: tint(MAT.stone, 0.1), flat: true });
}

// The fire: logs, flames and sparks, clipped to the opening.
function drawFire(ctx, t) {
  const w = FIRE.o1 - FIRE.o0;
  onPlane(ctx, 'left', FIRE.o1, FIRE.d, 0, (g) => {
    g.save();
    openingPath(g);
    g.clip();
    // Embers glowing on the grate.
    g.fillStyle = mix(C.coral, INK.oxblood, 0.4);
    g.fillRect(0.2, -0.42, w - 0.4, 0.2);
    // Flames: tongues that rise and fall.
    for (let i = 0; i < 7; i++) {
      const fx = 0.25 + (i / 6) * (w - 0.5);
      const fh = 0.55 + 0.3 * Math.sin(t * 7.3 + i * 1.9) + 0.18 * Math.sin(t * 12.1 + i * 3.1);
      const sway = Math.sin(t * 5 + i) * 0.06;
      for (const [k, col] of [[1, C.coral], [0.68, INK.candleGold], [0.34, INK.bone]]) {
        g.beginPath();
        g.moveTo(fx - 0.18 * k, -0.35);
        g.quadraticCurveTo(fx - 0.2 * k, -0.35 - fh * k * 0.6, fx + sway, -0.35 - fh * k);
        g.quadraticCurveTo(fx + 0.2 * k, -0.35 - fh * k * 0.6, fx + 0.18 * k, -0.35);
        g.closePath();
        g.fillStyle = col;
        g.fill();
      }
    }
    // Logs.
    g.fillStyle = shade(MAT.oak, 0.35);
    g.beginPath();
    g.roundRect(0.3, -0.38, w * 0.45, 0.16, 0.08);
    g.roundRect(w * 0.45, -0.34, w * 0.45, 0.15, 0.08);
    g.fill();
    g.restore();
    // The grate's bars, in front of it all.
    g.beginPath();
    for (let i = 0; i < 7; i++) { g.moveTo(0.3 + i * (w - 0.6) / 6, -0.12); g.lineTo(0.3 + i * (w - 0.6) / 6, -0.5); }
    g.moveTo(0.2, -0.3); g.lineTo(w - 0.2, -0.3);
    g.strokeStyle = C.ink;
    g.lineWidth = 0.05;
    g.stroke();
  });
  // Sparks, rising out of it.
  if (!Q.detail) return;
  for (let i = 0; i < 5; i++) {
    const k = ((t * 0.7 + i * 0.37) % 1);
    const u = FIRE.o0 + 0.4 + hash(i, Math.floor(t * 0.7 + i * 0.37)) * (w - 0.8);
    const [X, Y] = SP('left', u, FIRE.d + 0.1 + k * 0.4, 0.6 + k * 1.3);
    ctx.fillStyle = alpha(INK.candleGold, 1 - k);
    ctx.fillRect(X - 0.025, Y - 0.025, 0.05, 0.05);
  }
}

// ---------- The window ----------
// Tall and Gothic, on the right wall, between the bookcases.
const WIN = { u: 6.75, w: 1.8, z: 1.6, h: 7.7 }; // the upright part; a pointed arch sits on top

function windowPath(g, grow = 0) {
  const { w, h } = WIN;
  g.beginPath();
  g.moveTo(-grow, grow);
  g.lineTo(-grow, -h);
  g.arc(w, -h, w + grow, Math.PI, Math.PI + Math.PI / 3);
  g.arc(0, -h, w + grow, -Math.PI / 3, 0);
  g.lineTo(w + grow, grow);
  g.closePath();
}

function drawWindow(ctx, t) {
  const { u, w, z, h } = WIN;
  const flash = storm.flash(t);
  onPlane(ctx, 'right', u, 0, z, (g) => {
    windowPath(g, 0.16);
    paint(g, MAT.stone, { lw: 0.05 });
    windowPath(g);
    paint(g, house.glass(t), { lw: 0.04 });
    g.save();
    windowPath(g);
    g.clip();
    // A thrashing tree outside, seen best by lightning.
    const sway = Math.sin(t * 2.3) * 0.12 + Math.sin(t * 0.7) * 0.08;
    g.strokeStyle = mix(INK.stormNavy, C.black, 0.3);
    g.lineCap = 'round';
    g.lineWidth = 0.22;
    g.beginPath();
    g.moveTo(1.5, 0.2); g.quadraticCurveTo(1.2, -3, 1.0 + sway, -6.2);
    g.stroke();
    g.lineWidth = 0.1;
    g.beginPath();
    g.moveTo(1.2, -2.8); g.quadraticCurveTo(0.4, -3.6, -0.1 + sway, -3.9);
    g.moveTo(1.1, -4.4); g.quadraticCurveTo(1.7, -5.4, 2.0 + sway, -5.6);
    g.moveTo(1.05, -5.3); g.quadraticCurveTo(0.5, -6.3, 0.2 + sway * 1.3, -7.4);
    g.moveTo(1.0 + sway, -6.2); g.quadraticCurveTo(1.3, -7.6, 1.6 + sway * 1.4, -8.1);
    g.stroke();
    // Rain running down the glass.
    if (Q.detail) {
      g.strokeStyle = alpha(INK.bone, 0.35 + flash * 0.4);
      g.lineWidth = 0.025;
      g.beginPath();
      for (let i = 0; i < 14; i++) {
        const k = (t * (0.35 + hash(i, 3) * 0.3) + hash(i, 5)) % 1;
        const x = 0.1 + hash(i, 7) * (w - 0.2);
        const y = -h - 1.2 + k * (h + 1.4);
        g.moveTo(x, y); g.lineTo(x + 0.03, y + 0.5);
      }
      g.stroke();
    }
    // Diamond leading.
    if (Q.detail) {
      g.strokeStyle = alpha(C.ink, 0.55);
      g.lineWidth = 0.025;
      g.beginPath();
      for (let s = -h - 2; s < 2; s += 0.55) {
        g.moveTo(0, s); g.lineTo(w, s + w * 0.9);
        g.moveTo(w, s); g.lineTo(0, s + w * 0.9);
      }
      g.stroke();
    }
    g.restore();
    // Stone mullion and transoms.
    g.fillStyle = MAT.stone;
    g.fillRect(w / 2 - 0.06, -h - 1.2, 0.12, h + 1.2);
    for (const ty of [-h * 0.33, -h * 0.66, -h]) g.fillRect(0, ty - 0.05, w, 0.1);
    if (Q.lines) {
      g.strokeStyle = C.ink;
      g.lineWidth = 0.03;
      g.strokeRect(w / 2 - 0.06, -h - 1.2, 0.12, h + 1.2);
    }
  });
  // The sill.
  box(ctx, u - 0.2, 0, z - 0.14, w + 0.4, 0.32, 0.14, MAT.stone, { flat: true, lw: 0.03 });
}

// Velvet drapes inside the window, tied back, stirring in the draft.
function drawDrapes(ctx, t) {
  const { u, w, z, h } = WIN;
  onPlane(ctx, 'right', u, 0.05, z, (g) => {
    const b = Math.sin(t * 1.1) * 0.05 + Math.sin(t * 2.9) * 0.02;
    for (const s of [0, 1]) {
      g.save();
      if (s) { g.translate(w, 0); g.scale(-1, 1); }
      g.beginPath();
      g.moveTo(-0.12, -h - 0.35);
      g.lineTo(0.55, -h - 0.35);
      g.quadraticCurveTo(0.45 + b, -h * 0.62, 0.22 + b * 0.5, -h * 0.42);
      g.quadraticCurveTo(0.34 + b, -h * 0.2, 0.3 + b * 1.4, 0.05);
      g.lineTo(-0.12, 0.05);
      g.closePath();
      paint(g, MAT.velvet, { dots: MAT.velvetDark, density: 0.3, lw: 0.035 });
      if (Q.detail) {
        g.beginPath();
        g.moveTo(0.12, -h - 0.3); g.quadraticCurveTo(0.2, -h * 0.6, 0.08, -h * 0.43);
        g.moveTo(0.1, -h * 0.4); g.quadraticCurveTo(0.2, -h * 0.2, 0.14 + b, 0);
        g.strokeStyle = MAT.velvetDark;
        g.lineWidth = 0.03;
        g.stroke();
      }
      // The tie-back.
      g.fillStyle = MAT.brass;
      g.fillRect(-0.1, -h * 0.43 - 0.06, 0.42 + b * 0.5, 0.1);
      g.restore();
    }
    // The pelmet.
    g.fillStyle = MAT.velvetDark;
    g.fillRect(-0.2, -h - 0.55, w + 0.4, 0.3);
    g.fillStyle = MAT.brass;
    g.fillRect(-0.2, -h - 0.58, w + 0.4, 0.06);
  });
}

// ---------- The gallery ----------
// A walkway round the upper floor, on brackets, with a brass rail.
function drawGallery(ctx) {
  const wood = MAT.mahogany;
  // Brackets under the front edges.
  if (Q.detail) {
    for (let y = 3; y < 15; y += 2) face(ctx, [[CASE, y, GAL - 0.3], [2.3, y, GAL - 0.3], [CASE, y, GAL - 1.2]], shade(wood, 0.3), { lw: 0.03 });
    for (let x = 3; x < 15; x += 2) face(ctx, [[x, CASE, GAL - 0.3], [x, 2.3, GAL - 0.3], [x, CASE, GAL - 1.2]], shade(wood, 0.15), { lw: 0.03 });
  }
  box(ctx, CASE, CASE, GAL - 0.3, 1.3, 15 - CASE, 0.3, wood, { top: RM.trim });
  box(ctx, 2.4, CASE, GAL - 0.3, 15 - 2.4, 1.3, 0.3, wood, { top: RM.trim });
  // A velvet runner along it.
  rect(ctx, CASE + 0.3, CASE + 0.3, 0.7, 14.9 - CASE - 0.3, GAL, MAT.velvet, { dots: MAT.velvetDark, density: 0.25, lw: 0.03 });
  rect(ctx, CASE + 1.0, CASE + 0.3, 14.9 - CASE - 1.0, 0.7, GAL, MAT.velvet, { dots: MAT.velvetDark, density: 0.25, lw: 0.03 });
  // The rail: balusters, then the handrail.
  const top = GAL + 1.0;
  ctx.beginPath();
  for (let y = 2.4; y <= 15.01; y += 0.4) { const a = P3(2.35, y, GAL), b = P3(2.35, y, top); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  for (let x = 2.8; x <= 15.01; x += 0.4) { const a = P3(x, 2.35, GAL), b = P3(x, 2.35, top); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  for (let x = CASE + 0.4; x < 2.4; x += 0.4) { const a = P3(x, 15, GAL), b = P3(x, 15, top); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  for (let y = CASE + 0.4; y < 2.4; y += 0.4) { const a = P3(15, y, GAL), b = P3(15, y, top); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.stroke(); }
  ctx.strokeStyle = RM.trim;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  const rail = [[CASE, 15, top], [2.35, 15, top], [2.35, 2.35, top], [15, 2.35, top], [15, CASE, top]];
  ctx.beginPath();
  rail.forEach((p, i) => { const [X, Y] = P3(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.lineJoin = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.stroke(); }
  ctx.strokeStyle = MAT.brass;
  ctx.lineWidth = 0.1;
  ctx.stroke();
  // Newel posts.
  for (const [x, y] of [[2.35, 2.35], [2.35, 15], [15, 2.35]]) {
    box(ctx, x - 0.08, y - 0.08, GAL, 0.16, 0.16, 1.15, RM.trim, { flat: true, lw: 0.03 });
    const [X, Y] = P3(x, y, GAL + 1.25);
    ctx.beginPath();
    ctx.arc(X, Y, 0.1, 0, Math.PI * 2);
    paint(ctx, MAT.brass, { lw: 0.03 });
  }
}

const P3 = (x, y, z = 0) => [x - y, (x + y) / 2 - z * ZK];
const LOOPT = 180;
const lt = (t) => ((t % LOOPT) + LOOPT) % LOOPT; // seconds into the evening

// ---------- The rug ----------
const RUG = { x0: 4.5, y0: 4.5, x1: 12, y1: 12 };
function drawRug(ctx) {
  const { x0, y0, x1, y1 } = RUG;
  const field = mix(INK.deepPlum, INK.stormNavy, 0.35);
  rect(ctx, x0, y0, x1 - x0, y1 - y0, 0.01, MAT.velvetDark, { lw: 0.04 });
  rect(ctx, x0 + 0.25, y0 + 0.25, x1 - x0 - 0.5, y1 - y0 - 0.5, 0.012, INK.oxblood, { stroke: false });
  rect(ctx, x0 + 0.55, y0 + 0.55, x1 - x0 - 1.1, y1 - y0 - 1.1, 0.014, field, { dots: shade(field, 0.5), density: 0.18, stroke: false });
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  // The medallion, and corners to match.
  disc(ctx, cx, cy, 0.016, 2.75, INK.oxblood, { stroke: false, dots: MAT.velvetDark, density: 0.2 });
  disc(ctx, cx, cy, 0.017, 2.75, null, { lw: 0.07, stroke: MAT.brassDark });
  disc(ctx, cx, cy, 0.017, 2.45, null, { lw: 0.04, stroke: MAT.brassDark });
  for (const [sx, sy] of [[x0 + 0.55, y0 + 0.55], [x1 - 0.55, y0 + 0.55], [x0 + 0.55, y1 - 0.55], [x1 - 0.55, y1 - 0.55]]) {
    const dx = sx < cx ? 1.3 : -1.3, dy = sy < cy ? 1.3 : -1.3;
    face(ctx, [[sx, sy, 0.016], [sx + dx, sy, 0.016], [sx, sy + dy, 0.016]], INK.oxblood, { stroke: false });
  }
  if (!Q.detail) return;
  // A running pattern in the border, and the fringe at both ends.
  ctx.beginPath();
  for (let u = x0 + 0.45; u < x1 - 0.3; u += 0.5) {
    for (const v of [y0 + 0.4, y1 - 0.4]) {
      const a = P3(u - 0.12, v, 0.02), b = P3(u, v - 0.1, 0.02), c = P3(u + 0.12, v, 0.02), d = P3(u, v + 0.1, 0.02);
      quad(ctx, a, b, c, d);
    }
  }
  for (let v = y0 + 0.45; v < y1 - 0.3; v += 0.5) {
    for (const u of [x0 + 0.4, x1 - 0.4]) {
      const a = P3(u - 0.1, v, 0.02), b = P3(u, v - 0.12, 0.02), c = P3(u + 0.1, v, 0.02), d = P3(u, v + 0.12, 0.02);
      quad(ctx, a, b, c, d);
    }
  }
  ctx.fillStyle = INK.candleGold;
  ctx.fill();
  ctx.beginPath();
  for (let v = y0 + 0.1; v < y1; v += 0.18) {
    for (const [u, du] of [[x0, -0.18], [x1, 0.18]]) {
      const a = P3(u, v, 0.01), b = P3(u + du, v + 0.03, 0.01);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
  }
  ctx.strokeStyle = INK.bone;
  ctx.lineWidth = 0.035;
  ctx.stroke();
}

// ---------- The table, the Lord and his trifle ----------
const TABLE = { x0: 6.5, y0: 6.5, x1: 9.5, y1: 9.5, h: 1.1 };
// Where the Lord sits, and how far he has tipped forward (radians).
// He's drawn a size up: he's the hero, and a big man.
const LORD = { x: 6.16, y: 8.05, z: 0.05, lean: 0.95, s: 1.25 };
// The bowl goes wherever his face ends up: the top of the trifle comes up to
// his nose, so his face is in it and the rest of his head isn't.
const BOWL = (() => {
  const [X, Y] = P3(LORD.x, LORD.y, LORD.z);
  const s = LORD.s;
  const hx = X + 1.15 * s * Math.sin(LORD.lean), hy = Y - 0.8 * s - 1.15 * s * Math.cos(LORD.lean);
  const z = TABLE.h + 0.02, rim = 0.72;
  const sx = hx + 0.16 * s, sy = hy + 0.27 * s;
  const sum = 2 * (sy + (z + rim) * ZK);
  return { x: (sum + sx) / 2, y: (sum - sx) / 2, z, rim, r: 0.46 };
})();
const PILLS = { x: 7.1, y: 9.2, z: TABLE.h + 0.1 }; // the bottle with beak marks (a find)
const LIPSTICK = { x: 9.2, y: 6.85, z: TABLE.h + 0.01 }; // the glass with lipstick (a find)

function tableTop(ctx) {
  const { x0, y0, x1, y1, h } = TABLE;
  const cloth = INK.bone;
  // Its shadow on the rug.
  rect(ctx, x0 - 0.1, y0 - 0.1, x1 - x0 + 0.4, y1 - y0 + 0.4, 0.02, alpha(C.ink, 0.6), { stroke: false });
  // Legs, where they show under the cloth.
  for (const [lx, ly] of [[x1 - 0.3, y1 - 0.3], [x0 + 0.15, y1 - 0.3], [x1 - 0.3, y0 + 0.15]]) {
    box(ctx, lx, ly, 0, 0.16, 0.16, 0.7, MAT.mahogany, { flat: true, lw: 0.03 });
  }
  // The cloth, hanging to a scalloped hem on the two sides we see.
  const hem = 0.62;
  const side = (pts, fill) => {
    ctx.beginPath();
    pts.forEach(([x, y, z], i) => { const [X, Y] = P3(x, y, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath();
    paint(ctx, fill, { lw: 0.035 });
  };
  const scallops = (from, to, fixed, alongX) => {
    const pts = [];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const u = from + ((to - from) * i) / n;
      pts.push(alongX ? [u, fixed, h - hem + (i % 2 ? 0.08 : 0)] : [fixed, u, h - hem + (i % 2 ? 0.08 : 0)]);
    }
    return pts;
  };
  side([[x0 - 0.1, y1 + 0.1, h], [x1 + 0.1, y1 + 0.1, h], ...scallops(x1 + 0.1, x0 - 0.1, y1 + 0.1, true)], shade(cloth, 0.12));
  side([[x1 + 0.1, y0 - 0.1, h], [x1 + 0.1, y1 + 0.1, h], ...scallops(y1 + 0.1, y0 - 0.1, x1 + 0.1, false)], shade(cloth, 0.05));
  rect(ctx, x0 - 0.1, y0 - 0.1, x1 - x0 + 0.2, y1 - y0 + 0.2, h, cloth, { lw: 0.04 });
  if (Q.detail) {
    // A lace edge, and confetti from the party.
    ctx.beginPath();
    for (let u = x0; u <= x1 + 0.05; u += 0.25) { const [X, Y] = P3(u, y1 + 0.1, h - 0.1); ctx.moveTo(X + 0.05, Y); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); }
    for (let u = y0; u <= y1 + 0.05; u += 0.25) { const [X, Y] = P3(x1 + 0.1, u, h - 0.1); ctx.moveTo(X + 0.05, Y); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); }
    ctx.strokeStyle = shade(cloth, 0.3);
    ctx.lineWidth = 0.02;
    ctx.stroke();
    const conf = [INK.oxblood, INK.verdigris, INK.candleGold, C.pink];
    for (let i = 0; i < 26; i++) {
      const cxp = x0 + 0.2 + hash(i, 41) * (x1 - x0 - 0.4), cyp = y0 + 0.2 + hash(i, 42) * (y1 - y0 - 0.4);
      if (Math.hypot(cxp - PILLS.x, cyp - PILLS.y) < 0.6) continue;
      const [X, Y] = P3(cxp, cyp, h + 0.005);
      ctx.fillStyle = conf[i % conf.length];
      ctx.fillRect(X - 0.035, Y - 0.02, 0.07, 0.04);
    }
  }
}

// The Lord's chair: carved mahogany, oxblood velvet, a crest on top.
function lordChair(ctx) {
  const x = LORD.x - 0.72, y = LORD.y - 0.46;
  for (const [lx, ly] of [[x + 0.72, y + 0.8], [x + 0.72, y + 0.02], [x + 0.02, y + 0.8]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.78, MAT.mahoganyDark, { flat: true, stroke: false });
  box(ctx, x, y, 0.72, 0.85, 0.92, 0.14, MAT.mahogany, { flat: true, lw: 0.03 });
  box(ctx, x + 0.05, y + 0.05, 0.86, 0.75, 0.82, 0.08, MAT.velvet, { top: tint(MAT.velvet, 0.1), lw: 0.03 });
  box(ctx, x - 0.02, y, 0.86, 0.16, 0.92, 1.6, MAT.mahogany, { right: MAT.velvet, lw: 0.035 });
  // The crest.
  const [X, Y] = P3(x + 0.06, y + 0.46, 2.46);
  ctx.beginPath();
  ctx.moveTo(X - 0.5, Y + 0.25);
  ctx.quadraticCurveTo(X - 0.35, Y - 0.35, X, Y - 0.32);
  ctx.quadraticCurveTo(X + 0.35, Y - 0.35, X + 0.5, Y - 0.2);
  ctx.lineTo(X + 0.5, Y + 0.05);
  ctx.closePath();
  paint(ctx, MAT.mahogany, { lw: 0.035 });
  ctx.beginPath();
  ctx.arc(X, Y - 0.12, 0.07, 0, Math.PI * 2);
  paint(ctx, MAT.brass, { lw: 0.02 });
}

// Lord Gooseworth, sitting at the table and tipped forward from the waist,
// face first into the bowl. Drawn in two halves: legs as they sit, and the rest
// of him turned about the hip.
function lordLegs(ctx, t) {
  const { x, y, z, s } = LORD;
  const [X, Y] = P3(x, y, z);
  const hy = Y - 0.8 * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(X - 2, hy - 0.1 * s, 4, 2);
  ctx.clip();
  drawCast(ctx, 'lord', { x, y, z, pose: 'sit', dir: 'r' }, t, { arms: [Math.PI, Math.PI], scale: s });
  ctx.restore();
}
function lord(ctx, t) {
  const { x, y, z, lean, s } = LORD;
  const [X, Y] = P3(x, y, z);
  const hy = Y - 0.8 * s;
  ctx.save();
  ctx.translate(X, hy);
  ctx.rotate(lean);
  ctx.translate(-X, -hy);
  ctx.beginPath();
  ctx.rect(X - 2, hy - 4, 4, 4 - 0.1 * s);
  ctx.clip();
  // (Arm angles here are in his tipped frame: the world angle plus the lean.
  // One arm flops over the table in front of the bowl, the other hangs.)
  drawCast(ctx, 'lord', { x, y, z, pose: 'sit', dir: 'r' }, t, {
    arms: [lean + 0.55, lean - 0.35],
    scale: s,
    wear: napkin,
  });
  if (Q.detail) {
    // Eyes: two little crosses, the cartoon way (turned back upright).
    const ey = Y + (-1.95 + 0.02) * s;
    ctx.fillStyle = CAST_SKIN;
    ctx.beginPath();
    ctx.arc(X + 0.1 * s, ey, 0.05 * s, 0, Math.PI * 2);
    ctx.arc(X + 0.24 * s, ey, 0.05 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    const e = 0.07 * s;
    for (const ex of [0.1 * s, 0.24 * s]) {
      for (const a of [Math.PI / 4 - lean, -Math.PI / 4 - lean]) {
        const cx = Math.cos(a) * e, cy = Math.sin(a) * e;
        ctx.moveTo(X + ex - cx, ey - cy); ctx.lineTo(X + ex + cx, ey + cy);
      }
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.035;
    ctx.stroke();
    // A raspberry, landed on his head.
    ctx.beginPath();
    ctx.arc(X - 0.14 * s, Y - 2.3 * s, 0.09, 0, Math.PI * 2);
    paint(ctx, MAT.trifle, { lw: 0.02 });
  }
  ctx.restore();
}

// His napkin, still tucked in: white on the dark velvet, so he reads.
function napkin(ctx, b) {
  if (b.back) return;
  ctx.beginPath();
  ctx.moveTo(-0.04, b.top + 0.02);
  ctx.lineTo(0.3, b.top + 0.02);
  ctx.lineTo(0.34, b.top + 0.62);
  ctx.lineTo(0.2, b.top + 0.56);
  ctx.lineTo(0.08, b.top + 0.66);
  ctx.lineTo(-0.06, b.top + 0.56);
  ctx.closePath();
  paint(ctx, INK.bone, { lw: 0.03 });
  if (!Q.detail) return;
  // A blob of custard on it.
  ctx.beginPath();
  ctx.arc(0.16, b.top + 0.36, 0.05, 0, Math.PI * 2);
  ctx.fillStyle = MAT.custard;
  ctx.fill();
}

// The trifle bowl: a footed glass bowl, its layers showing through the glass.
// back: the foot and the top (drawn before the Lord's head); front: the near
// half of the top and the side (drawn after, so his face is in it).
function bowl(ctx, part) {
  const { x, y, z, r, rim } = BOWL;
  const [X, Yb] = P3(x, y, z);
  const rx = r * Math.SQRT2, ry = rx / 2;
  const foot = 0.24;
  const Yr = Yb - rim * ZK, Yf = Yb - foot * ZK;
  const rb = 0.6; // the bottom of the bowl, as a share of the rim
  if (part === 'back') {
    // Foot and stem.
    ctx.beginPath();
    ctx.ellipse(X, Yb, 0.34, 0.17, 0, 0, Math.PI * 2);
    paint(ctx, alpha(MAT.glass, 0.45), { lw: 0.03 });
    ctx.fillStyle = alpha(MAT.glass, 0.7);
    ctx.fillRect(X - 0.06, Yf, 0.12, Yb - Yf);
    // The top: raspberry jelly, with what's left of the cream in dollops.
    ctx.beginPath();
    ctx.ellipse(X, Yr, rx, ry, 0, 0, Math.PI * 2);
    paint(ctx, MAT.trifle, { lw: 0.03, dots: shade(MAT.trifle, 0.35), density: 0.2 });
    ctx.fillStyle = MAT.cream;
    for (const [dx, dy, s] of [[-0.42, -0.02, 0.1], [-0.2, -0.17, 0.09], [0.35, -0.12, 0.1]]) {
      ctx.beginPath();
      ctx.arc(X + dx, Yr + dy, s, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  // The near half of the top, over his face, heaped up where it went in.
  ctx.beginPath();
  ctx.ellipse(X, Yr, rx, ry, 0, 0, Math.PI);
  ctx.quadraticCurveTo(X - rx * 0.4, Yr - 0.02, X - 0.12, Yr - 0.08);
  ctx.quadraticCurveTo(X + 0.12, Yr - 0.14, X + rx * 0.45, Yr - 0.03);
  ctx.quadraticCurveTo(X + rx * 0.8, Yr + 0.02, X + rx, Yr);
  paint(ctx, MAT.trifle, { lw: 0.02, dots: shade(MAT.trifle, 0.35), density: 0.2 });
  ctx.beginPath();
  ctx.moveTo(X - 0.3, Yr - 0.02);
  ctx.quadraticCurveTo(X - 0.1, Yr - 0.13, X + 0.1, Yr - 0.1);
  ctx.quadraticCurveTo(X + 0.3, Yr - 0.08, X + 0.36, Yr - 0.01);
  ctx.quadraticCurveTo(X + 0.05, Yr + 0.05, X - 0.3, Yr - 0.02);
  paint(ctx, MAT.cream, { lw: 0.02 });
  // The side: sponge, jelly, custard and cream, through the glass.
  const side = (y0, y1, k0, k1) => {
    ctx.beginPath();
    ctx.moveTo(X - rx * k0, y0);
    ctx.ellipse(X, y0, rx * k0, ry * k0, 0, Math.PI, 0, true);
    ctx.lineTo(X + rx * k1, y1);
    ctx.ellipse(X, y1, rx * k1, ry * k1, 0, 0, Math.PI, false);
    ctx.closePath();
  };
  const layers = [[MAT.oakLight, foot, 0.38], [MAT.trifle, 0.38, 0.52], [MAT.custard, 0.52, 0.64], [MAT.cream, 0.64, rim]];
  for (const [col, a, b] of layers) {
    const ka = rb + (1 - rb) * (a - foot) / (rim - foot), kb = rb + (1 - rb) * (b - foot) / (rim - foot);
    side(Yb - b * ZK, Yb - a * ZK, kb * 0.97, ka * 0.97);
    ctx.fillStyle = col;
    ctx.fill();
  }
  side(Yr, Yf, 1, rb);
  paint(ctx, alpha(MAT.glass, 0.25), { lw: 0.035 });
  ctx.beginPath();
  ctx.ellipse(X, Yr, rx, ry, 0, 0, Math.PI);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.035;
  ctx.stroke();
  if (Q.detail) {
    // A glint on the glass, and his nose, squashed against it.
    ctx.beginPath();
    ctx.moveTo(X - rx * 0.72, Yr + 0.18);
    ctx.quadraticCurveTo(X - rx * 0.76, Yr + 0.34, X - rx * 0.58, Yr + 0.46);
    ctx.strokeStyle = alpha(C.white, 0.75);
    ctx.lineWidth = 0.045;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(X + 0.26, Yr + 0.3, 0.1, 0.075, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = alpha(mix(SKIN[5], INK.oxblood, 0.2), 0.9);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(X + 0.06, Yr + 0.2); ctx.quadraticCurveTo(X + 0.11, Yr + 0.25, X + 0.17, Yr + 0.2);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.022;
    ctx.stroke();
  }
}

// The Lord's medicine, and the dinner things, in a heap at his elbow. He was
// eighty: there are a lot of bottles. Only one pill bottle has a chewed cap
// (a find), and only that one has spilled its "pills" (the doctor's mints).

// An amber pill bottle at (x, y, z). Lying, its cap points along rot;
// standing (up), the cap is on top.
function pillBottle(ctx, x, y, z, o = {}) {
  const { s = 0.72, rot = -0.28, up = false, bitten = false, mints = false } = o;
  const [X, Y] = P3(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  if (up) { ctx.translate(0, -0.28 * s); ctx.rotate(-Math.PI / 2); } else ctx.rotate(rot);
  ctx.scale(s, s);
  if (mints) {
    // Two mints, rolled out of it.
    for (const [mx, my] of [[0.42, 0.12], [0.56, 0.03]]) {
      ctx.beginPath();
      ctx.ellipse(mx, my, 0.065, 0.04, 0, 0, Math.PI * 2);
      paint(ctx, C.white, { lw: 0.02 });
    }
  }
  ctx.beginPath();
  ctx.roundRect(-0.28, -0.12, 0.44, 0.24, 0.06);
  paint(ctx, mix(INK.candleGold, INK.oxblood, 0.35), { lw: 0.03 });
  ctx.fillStyle = INK.bone;
  ctx.fillRect(-0.18, -0.08, 0.2, 0.16);
  ctx.fillStyle = alpha(C.white, 0.45);
  ctx.fillRect(-0.24, -0.09, 0.36, 0.035);
  ctx.beginPath();
  if (bitten) {
    // The cap, bitten: a zigzag of beak marks where its end should be.
    ctx.moveTo(0.16, -0.1); ctx.lineTo(0.3, -0.1);
    ctx.lineTo(0.26, -0.05); ctx.lineTo(0.31, -0.01); ctx.lineTo(0.25, 0.03); ctx.lineTo(0.3, 0.07);
    ctx.lineTo(0.3, 0.1); ctx.lineTo(0.16, 0.1);
    ctx.closePath();
  } else {
    ctx.roundRect(0.16, -0.1, 0.14, 0.2, 0.02);
  }
  paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath();
  if (bitten) {
    // Little dents across it.
    ctx.moveTo(0.19, -0.06); ctx.lineTo(0.22, -0.02); ctx.lineTo(0.19, 0.02); ctx.lineTo(0.22, 0.06);
  } else {
    // A plain cap has straight ribs.
    for (const u of [0.2, 0.24]) { ctx.moveTo(u, -0.08); ctx.lineTo(u, 0.08); }
  }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.02;
  ctx.stroke();
  ctx.restore();
}

// Any other bottle, standing: its outline as [half-width, height] pairs up
// from the base. Tonic in green glass with a cork, a squat sauce, salt and pepper.
const BOTTLES = {
  tonic: { body: mix(INK.verdigris, INK.stormNavy, 0.35), cap: MAT.oakLight, label: INK.bone, shape: [[0.1, 0], [0.1, 0.34], [0.04, 0.44], [0.035, 0.56]] },
  sauce: { body: INK.oxblood, cap: C.ink, label: MAT.custard, shape: [[0.09, 0], [0.09, 0.22], [0.035, 0.34], [0.035, 0.4]] },
  salt: { body: INK.bone, cap: MAT.silver, shape: [[0.055, 0], [0.06, 0.16], [0.05, 0.2]] },
  pepper: { body: mix(INK.stormNavy, INK.deepPlum, 0.4), cap: MAT.silver, shape: [[0.055, 0], [0.06, 0.16], [0.05, 0.2]] },
};
function bottle(ctx, x, y, z, kind, s = 1) {
  const b = BOTTLES[kind];
  const pts = b.shape;
  const top = pts[pts.length - 1][1], w = pts[pts.length - 1][0];
  const [X, Y] = P3(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-pts[0][0], 0);
  for (const [pw, ph] of pts) ctx.lineTo(-pw, -ph);
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], -pts[i][1]);
  ctx.closePath();
  paint(ctx, b.body, { lw: 0.025 });
  ctx.beginPath();
  ctx.roundRect(-w - 0.008, -top - 0.06, (w + 0.008) * 2, 0.07, 0.015);
  paint(ctx, b.cap, { lw: 0.02 });
  if (b.label) {
    const lw = pts[0][0] - 0.01, lh = pts[1][1];
    ctx.fillStyle = b.label;
    ctx.fillRect(-lw, -lh * 0.75, lw * 2, lh * 0.42);
  }
  ctx.fillStyle = alpha(C.white, 0.35);
  ctx.fillRect(-pts[0][0] * 0.65, -pts[1][1] * 0.9, 0.025, pts[1][1] * 0.7);
  ctx.restore();
}

// A silver hip flask, lying flat.
function hipFlask(ctx, x, y, z, rot = 0.35) {
  const [X, Y] = P3(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.roundRect(-0.18, -0.09, 0.3, 0.18, 0.07);
  paint(ctx, MAT.silver, { lw: 0.025, dots: shade(MAT.silver, 0.3), density: 0.2 });
  ctx.beginPath();
  ctx.roundRect(0.12, -0.035, 0.07, 0.07, 0.015);
  paint(ctx, MAT.brassDark, { lw: 0.02 });
  ctx.restore();
}

// A pill box with a lid for each day, flat on the cloth.
function pillBox(ctx, x, y, z) {
  box(ctx, x - 0.1, y - 0.2, z, 0.2, 0.4, 0.06, INK.oxblood, { top: tint(INK.oxblood, 0.15), lw: 0.02 });
  if (!Q.detail) return;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) { const a = P3(x - 0.1, y - 0.2 + i * 0.1, z + 0.06), b = P3(x + 0.1, y - 0.2 + i * 0.1, z + 0.06); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.015;
  ctx.stroke();
}

// Party things on the table, round the Lord.
function tableThings(ctx) {
  const h = TABLE.h;
  // His plate and spoon, pushed aside.
  disc(ctx, 8.35, 8.75, h + 0.01, 0.34, INK.bone, { lw: 0.03 });
  disc(ctx, 8.35, 8.75, h + 0.02, 0.22, tint(INK.bone, 0.3), { stroke: false });
  face(ctx, [[8.1, 8.5, h + 0.03], [8.6, 9.0, h + 0.03]], null, { lw: 0.05, stroke: MAT.silver });
  // A cracker, pulled, and its paper crown.
  for (const [cx, cy, s] of [[8.8, 7.45, 1], [9.15, 7.2, -1]]) {
    const [X, Y] = P3(cx, cy, h + 0.08);
    ctx.save();
    ctx.translate(X, Y);
    ctx.scale(s, 1);
    ctx.beginPath();
    ctx.moveTo(-0.2, -0.06); ctx.lineTo(0.12, -0.06); ctx.lineTo(0.2, -0.1); ctx.lineTo(0.2, 0.1); ctx.lineTo(0.12, 0.06); ctx.lineTo(-0.2, 0.06);
    ctx.closePath();
    paint(ctx, INK.verdigris, { lw: 0.02 });
    ctx.restore();
  }
  const [cX, cY] = P3(9.0, 8.3, h + 0.02);
  ctx.beginPath();
  ctx.moveTo(cX - 0.22, cY); ctx.lineTo(cX - 0.22, cY - 0.12); ctx.lineTo(cX - 0.13, cY - 0.05); ctx.lineTo(cX - 0.05, cY - 0.16);
  ctx.lineTo(cX + 0.04, cY - 0.05); ctx.lineTo(cX + 0.13, cY - 0.16); ctx.lineTo(cX + 0.2, cY - 0.05); ctx.lineTo(cX + 0.22, cY);
  ctx.closePath();
  paint(ctx, INK.candleGold, { lw: 0.02 });
  // A birthday card: 80 TODAY.
  const [kX, kY] = P3(9.1, 7.9, h + 0.02);
  ctx.beginPath();
  ctx.moveTo(kX - 0.22, kY); ctx.lineTo(kX - 0.18, kY - 0.42); ctx.lineTo(kX + 0.2, kY - 0.46); ctx.lineTo(kX + 0.24, kY - 0.04);
  ctx.closePath();
  paint(ctx, INK.verdigris, { lw: 0.02 });
  if (Q.detail) {
    const k = 40;
    ctx.save();
    ctx.translate(kX + 0.02, kY - 0.24);
    ctx.scale(1 / k, 1 / k);
    ctx.font = `${0.22 * k}px "Bagel Fat One", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK.candleGold;
    ctx.fillText('80', 0, 0);
    ctx.restore();
  }
  // The candelabra, three candles (their flames are lights).
  const [aX, aY] = P3(8.55, 6.95, h);
  ctx.beginPath();
  ctx.ellipse(aX, aY, 0.2, 0.1, 0, 0, Math.PI * 2);
  paint(ctx, MAT.brass, { lw: 0.025 });
  ctx.beginPath();
  ctx.moveTo(aX, aY); ctx.lineTo(aX, aY - 1.0);
  ctx.moveTo(aX - 0.42, aY - 0.72); ctx.quadraticCurveTo(aX - 0.4, aY - 0.4, aX, aY - 0.42);
  ctx.quadraticCurveTo(aX + 0.4, aY - 0.4, aX + 0.42, aY - 0.72);
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.strokeStyle = MAT.brass;
  ctx.lineWidth = 0.06;
  ctx.stroke();
  // A splash of trifle across the cloth, running to the edge.
  ctx.beginPath();
  const sp = [[7.75, 8.35], [8.0, 8.8], [8.2, 9.25], [8.3, 9.62]];
  sp.forEach(([sx, sy], i) => { const [X, Y] = P3(sx, sy, h + 0.01); ctx.moveTo(X + 0.14 - i * 0.02, Y); ctx.ellipse(X, Y, 0.14 - i * 0.02, 0.07 - i * 0.01, 0, 0, Math.PI * 2); });
  ctx.fillStyle = MAT.trifle;
  ctx.fill();
  ctx.beginPath();
  for (const [sx, sy] of [[7.85, 8.55], [8.1, 9.0], [7.7, 8.2]]) { const [X, Y] = P3(sx, sy, h + 0.012); ctx.moveTo(X + 0.08, Y); ctx.ellipse(X, Y, 0.08, 0.045, 0, 0, Math.PI * 2); }
  ctx.fillStyle = MAT.custard;
  ctx.fill();
}

// The bottles and glasses on the table, back to front so they overlap right.
function tableClutter(ctx) {
  const h = TABLE.h;
  // The toast: one glass went over when he did, one is still half full, and
  // one has Lady Philippa's lipstick on it (a find).
  wineGlass(ctx, 7.75, 7.3, h + 0.01, { over: 1 });
  wineGlass(ctx, LIPSTICK.x, LIPSTICK.y, LIPSTICK.z, { lip: true, fill: 0.15 });
  bottle(ctx, 9.3, 8.45, h, 'sauce', 0.85);
  // His medicine, at his elbow.
  pillBox(ctx, 7.05, 8.4, h);
  bottle(ctx, 6.9, 8.8, h, 'tonic', 0.9);
  pillBottle(ctx, 7.3, 8.85, h, { up: true });
  bottle(ctx, 9.3, 8.9, h, 'salt');
  bottle(ctx, 8.95, 9.3, h, 'pepper');
  pillBottle(ctx, PILLS.x, PILLS.y, PILLS.z, { bitten: true, mints: true });
  pillBottle(ctx, 7.65, 9.3, h + 0.09, { rot: 2.9 });
  hipFlask(ctx, 8.6, 9.3, h + 0.03);
  wineGlass(ctx, 9.35, 9.2, h + 0.01, { fill: 0.5 });
}

// Everything at the table, in the order it stacks up.
function tableScene(ctx, t) {
  lordChair(ctx);
  lordLegs(ctx, t);
  tableTop(ctx);
  tableThings(ctx);
  tableClutter(ctx);
  bowl(ctx, 'back');
  lord(ctx, t);
  bowl(ctx, 'front');
}

// ---------- The bear ----------
// Bruno, stuffed in 1974, on a plinth in the corner by the fire, arms up.
const BEAR = { x: 3.9, y: 10.9, plinth: 0.45 };
function bear(ctx, t) {
  const T = lt(t);
  // Pidge leans in: a fraction of a turn toward him while he's asking.
  const asking = (a, b) => clamp01(Math.min((T - a) / 1.5, (b - T) / 1.5));
  const turn = Math.max(asking(8, 16), asking(140, 148) * 1.3, asking(120, 128) * -0.6);
  box(ctx, 3.0, 10.0, 0, 1.8, 1.8, BEAR.plinth, MAT.mahogany, { top: RM.trim, lw: 0.04 });
  wface(ctx, 'left', 10.5, 4.81, 0.1, 0.8, 0.25, MAT.brass, { lw: 0.02 });
  if (Q.detail) planeText(ctx, 'left', 10.9, 4.82, 0.225, 'BRUNO 1974', 0.12, C.ink);
  const [X, Y] = P3(BEAR.x, BEAR.y, BEAR.plinth);
  const fur = MAT.fur, dark = MAT.furDark, pale = mix(MAT.fur, INK.bone, 0.4);
  const furO = { dots: dark, density: 0.25, lw: 0.05 };
  ctx.save();
  ctx.translate(X, Y);
  // Legs and feet.
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(s > 0 ? 0.1 : -0.6, -1.35, 0.5, 1.3, 0.22);
    paint(ctx, fur, furO);
    ctx.beginPath();
    ctx.ellipse(s * 0.38, -0.08, 0.32, 0.13, 0, 0, Math.PI * 2);
    paint(ctx, dark, { lw: 0.04 });
  }
  // Arms, raised: the classic pose, which isn't helping his case.
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 0.62, -3.05);
    ctx.quadraticCurveTo(s * 1.25, -3.3, s * 1.42, -4.05);
    ctx.lineCap = 'round';
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.56; ctx.stroke(); }
    ctx.strokeStyle = fur;
    ctx.lineWidth = 0.46;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 1.45, -4.2, 0.26, 0, Math.PI * 2);
    paint(ctx, fur, furO);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + s * (-0.5 + i * 0.35);
      const bx = s * 1.45 + Math.cos(a) * 0.24, by = -4.2 + Math.sin(a) * 0.24;
      ctx.moveTo(bx - 0.04, by); ctx.lineTo(bx + Math.cos(a) * 0.14, by + Math.sin(a) * 0.14); ctx.lineTo(bx + 0.04, by);
    }
    paint(ctx, INK.bone, { lw: 0.015 });
  }
  // Body and belly.
  ctx.beginPath();
  ctx.ellipse(0, -2.35, 0.98, 1.35, 0, 0, Math.PI * 2);
  paint(ctx, fur, furO);
  ctx.beginPath();
  ctx.ellipse(0, -2.15, 0.6, 0.9, 0, 0, Math.PI * 2);
  paint(ctx, pale, { stroke: false, dots: fur, density: 0.2 });
  // Handcuffs on one wrist: Pidge's work.
  ctx.beginPath();
  ctx.arc(1.3, -3.72, 0.11, 0, Math.PI * 2);
  ctx.moveTo(1.29, -3.42); ctx.arc(1.2, -3.42, 0.09, 0, Math.PI * 2);
  ctx.strokeStyle = MAT.silver;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  // The head, turning a fraction.
  ctx.save();
  ctx.translate(0, -3.5);
  ctx.rotate(turn * 0.1);
  ctx.translate(turn * 0.08, 3.5);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 0.45, -4.5, 0.2, 0, Math.PI * 2);
    paint(ctx, fur, furO);
    ctx.beginPath();
    ctx.arc(s * 0.45, -4.5, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = pale;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, -4.02, 0.6, 0, Math.PI * 2);
  paint(ctx, fur, furO);
  ctx.beginPath();
  ctx.ellipse(0, -3.8, 0.32, 0.24, 0, 0, Math.PI * 2);
  paint(ctx, pale, { lw: 0.03 });
  // A roar, with teeth.
  ctx.beginPath();
  ctx.ellipse(0, -3.64, 0.19, 0.12, 0, 0, Math.PI * 2);
  paint(ctx, MAT.velvetDark, { lw: 0.03 });
  ctx.fillStyle = INK.bone;
  ctx.beginPath();
  ctx.moveTo(-0.12, -3.72); ctx.lineTo(-0.08, -3.6); ctx.lineTo(-0.04, -3.72);
  ctx.moveTo(0.04, -3.72); ctx.lineTo(0.08, -3.6); ctx.lineTo(0.12, -3.72);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -3.9, 0.1, 0.07, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
  // Glass eyes.
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 0.23 + turn * 0.03, -4.15, 0.075, 0, Math.PI * 2);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  ctx.restore();
  // SUSPECT, on a tag round his neck.
  ctx.beginPath();
  ctx.moveTo(-0.3, -3.45); ctx.lineTo(0.05, -2.95); ctx.lineTo(0.35, -3.45);
  ctx.strokeStyle = INK.bone;
  ctx.lineWidth = 0.025;
  ctx.stroke();
  ctx.save();
  ctx.translate(0.05, -2.8);
  ctx.rotate(0.08);
  ctx.beginPath();
  ctx.roundRect(-0.36, -0.14, 0.72, 0.28, 0.04);
  paint(ctx, INK.bone, { lw: 0.025 });
  if (Q.detail) {
    const k = 40;
    ctx.scale(1 / k, 1 / k);
    ctx.font = `${0.15 * k}px "Bagel Fat One", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK.oxblood;
    ctx.fillText('SUSPECT', 0, 0.01 * k);
  }
  ctx.restore();
  ctx.restore();
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------- The rest of the furniture ----------
// A green leather wingback, facing the fire (its back to the room).
function armchair(ctx, y0) {
  const leather = mix(INK.verdigris, INK.stormNavy, 0.35);
  const x0 = 2.4;
  for (const [lx, ly] of [[x0 + 0.95, y0 + 1.0], [x0 + 0.05, y0 + 1.0], [x0 + 0.95, y0 + 0.05]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.15, C.ink, { flat: true, stroke: false });
  box(ctx, x0, y0, 0.15, 1.1, 0.22, 0.75, leather, { lw: 0.035 });
  box(ctx, x0 + 0.05, y0 + 0.2, 0.15, 1.0, 0.7, 0.42, leather, { lw: 0.035 });
  box(ctx, x0 + 0.1, y0 + 0.22, 0.57, 0.8, 0.66, 0.12, tint(leather, 0.1), { lw: 0.03 });
  box(ctx, x0, y0 + 0.88, 0.15, 1.1, 0.22, 0.75, leather, { lw: 0.035 });
  box(ctx, x0 + 0.85, y0, 0.15, 0.3, 1.1, 1.55, leather, { lw: 0.035 });
  if (!Q.detail) return;
  // Brass studs down the back.
  ctx.fillStyle = MAT.brass;
  for (let i = 0; i < 6; i++) {
    const [X, Y] = P3(x0 + 1.15, y0 + 0.1 + i * 0.18, 1.62);
    ctx.fillRect(X - 0.025, Y - 0.025, 0.05, 0.05);
  }
}

// A little round wine table, and what's on it.
const SIDE = { x: 12.6, y: 4.0, h: 1.0 };
function sideTable(ctx) {
  const { x, y, h } = SIDE;
  const [X, Y] = P3(x, y, 0);
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.45, 0.22, 0, 0, Math.PI * 2);
  paint(ctx, MAT.mahoganyDark, { lw: 0.03 });
  ctx.fillStyle = MAT.mahoganyDark;
  ctx.fillRect(X - 0.07, Y - h * ZK, 0.14, h * ZK);
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.strokeRect(X - 0.07, Y - h * ZK, 0.14, h * ZK); }
  const top = Y - h * ZK;
  ctx.beginPath();
  ctx.moveTo(X - 0.85, top);
  ctx.ellipse(X, top, 0.85, 0.43, 0, Math.PI, 0, true);
  ctx.lineTo(X + 0.85, top - 0.08);
  ctx.ellipse(X, top - 0.08, 0.85, 0.43, 0, 0, Math.PI, false);
  ctx.closePath();
  paint(ctx, MAT.mahoganyDark, { lw: 0.03 });
  ctx.beginPath();
  ctx.ellipse(X, top - 0.08, 0.85, 0.43, 0, 0, Math.PI * 2);
  paint(ctx, MAT.mahogany, { lw: 0.03 });
  // A decanter of port, at the back.
  const [dX, dY] = P3(12.3, 3.65, h);
  ctx.beginPath();
  ctx.moveTo(dX - 0.2, dY - 0.05);
  ctx.quadraticCurveTo(dX - 0.26, dY - 0.4, dX - 0.06, dY - 0.5);
  ctx.lineTo(dX - 0.05, dY - 0.68); ctx.lineTo(dX + 0.05, dY - 0.68); ctx.lineTo(dX + 0.06, dY - 0.5);
  ctx.quadraticCurveTo(dX + 0.26, dY - 0.4, dX + 0.2, dY - 0.05);
  ctx.closePath();
  paint(ctx, alpha(MAT.glass, 0.45), { lw: 0.025 });
  ctx.beginPath();
  ctx.moveTo(dX - 0.19, dY - 0.08); ctx.quadraticCurveTo(dX - 0.23, dY - 0.28, dX - 0.2, dY - 0.3);
  ctx.lineTo(dX + 0.2, dY - 0.3); ctx.quadraticCurveTo(dX + 0.23, dY - 0.28, dX + 0.19, dY - 0.08);
  ctx.closePath();
  ctx.fillStyle = MAT.wine;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(dX, dY - 0.74, 0.07, 0, Math.PI * 2);
  paint(ctx, alpha(MAT.glass, 0.7), { lw: 0.02 });
  // An ashtray, with the Brigadier's cigar in it.
  const [aX, aY] = P3(12.95, 3.55, h);
  ctx.beginPath();
  ctx.ellipse(aX, aY - 0.04, 0.16, 0.08, 0, 0, Math.PI * 2);
  paint(ctx, MAT.silver, { lw: 0.02 });
  ctx.fillStyle = MAT.brassDark;
  ctx.fillRect(aX - 0.02, aY - 0.1, 0.3, 0.06);
  ctx.fillStyle = INK.bone;
  ctx.fillRect(aX + 0.26, aY - 0.1, 0.04, 0.06);
}

// A wine glass at (x, y, z), standing, or knocked over on its side (over: 1
// or -1, which way it fell). fill: how much wine is left (0 to 1). Only one
// glass in the room has a lipstick print on its rim (lip): Lady Philippa's (a find).
function wineGlass(ctx, x, y, z, o = {}) {
  const { s = 0.78, fill = 0, lip = false, over = 0 } = o;
  const [X, Y] = P3(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  if (over) {
    // Knocked over: what was in it, run out across whatever it's on.
    ctx.beginPath();
    ctx.ellipse(over * 0.5, 0.02, 0.3, 0.11, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(MAT.wine, 0.85);
    ctx.fill();
    ctx.translate(0, -0.17);
    ctx.rotate(over * 1.45);
    ctx.translate(0, 0.28);
  }
  const g = alpha(MAT.glass, 0.4);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.16, 0.07, 0, 0, Math.PI * 2);
  paint(ctx, g, { lw: 0.025 });
  ctx.fillStyle = alpha(MAT.glass, 0.8);
  ctx.fillRect(-0.02, -0.26, 0.04, 0.26);
  const bowlPath = () => {
    ctx.beginPath();
    ctx.moveTo(-0.19, -0.56);
    ctx.quadraticCurveTo(-0.2, -0.26, 0, -0.25);
    ctx.quadraticCurveTo(0.2, -0.26, 0.19, -0.56);
    ctx.closePath();
  };
  bowlPath();
  paint(ctx, g, { lw: 0.03 });
  if (fill > 0 && !over) {
    // The wine, up to its level, flat on top.
    const lv = -0.27 - fill * 0.25;
    ctx.save();
    bowlPath();
    ctx.clip();
    ctx.fillStyle = MAT.wine;
    ctx.fillRect(-0.25, lv, 0.5, 0.3);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(0, lv, 0.1 + fill * 0.08, 0.035, 0, 0, Math.PI * 2);
    ctx.fillStyle = shade(MAT.wine, 0.25);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, -0.56, 0.19, 0.06, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.025;
  ctx.stroke();
  if (lip) {
    // Her oxblood, a kiss on the rim.
    ctx.beginPath();
    ctx.ellipse(0.1, -0.53, 0.07, 0.035, -0.3, 0, Math.PI * 2);
    ctx.ellipse(0.11, -0.49, 0.06, 0.03, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = INK.oxblood;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-0.12, -0.5); ctx.lineTo(-0.1, -0.34);
  ctx.strokeStyle = alpha(C.white, 0.7);
  ctx.lineWidth = 0.03;
  ctx.stroke();
  ctx.restore();
}

// Goose feathers on the rug (a find): three small ones, in with the rest of
// the party's mess, where the goose stood at midnight.
const FEATHERS = { x: 10.85, y: 10.95 };
function feathers(ctx) {
  const [X, Y] = P3(FEATHERS.x, FEATHERS.y, 0.03);
  const white = mix(C.white, INK.bone, 0.3);
  for (const [fx, fy, a, len] of [[-0.14, 0.02, -0.4, 0.24], [0.04, -0.05, 0.5, 0.22], [0.12, 0.07, 2.6, 0.18]]) {
    ctx.save();
    ctx.translate(X + fx, Y + fy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -0.09, len, -0.02);
    ctx.quadraticCurveTo(len * 0.55, 0.07, 0, 0);
    paint(ctx, white, { lw: 0.018 });
    ctx.beginPath();
    ctx.moveTo(-0.04, 0.01); ctx.quadraticCurveTo(len * 0.5, -0.03, len * 0.95, -0.02);
    ctx.strokeStyle = C.grey;
    ctx.lineWidth = 0.012;
    ctx.stroke();
    // A wisp of down where the quill starts.
    ctx.beginPath();
    ctx.moveTo(0.04, -0.01); ctx.quadraticCurveTo(0.0, -0.06, -0.04, -0.05);
    ctx.moveTo(0.04, 0.01); ctx.quadraticCurveTo(0.0, 0.06, -0.03, 0.06);
    ctx.strokeStyle = white;
    ctx.lineWidth = 0.02;
    ctx.stroke();
    ctx.restore();
  }
}

// What the party left on the rug: confetti, streamers, crumbs, a crown,
// napkins, a cracker's joke. Lots of small pale bits, so the feathers are
// just three more of them until you look.
function partyMess(ctx) {
  const { x0, y0, x1, y1 } = RUG;
  const skip = (x, y) => (x > TABLE.x0 - 0.2 && x < TABLE.x1 + 0.2 && y > TABLE.y0 - 0.2 && y < TABLE.y1 + 0.2)
    || Math.hypot(x - FEATHERS.x, y - FEATHERS.y) < 0.3;
  // Streamers, curled where they fell.
  const curl = (x, y, len, a, col) => {
    const [X, Y] = P3(x, y, 0.02);
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const k = i / 18, u = k * len;
      const px = X + Math.cos(a) * u + Math.cos(k * 14) * 0.06, py = Y + Math.sin(a) * u * 0.5 + Math.sin(k * 14) * 0.05;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.045;
    ctx.stroke();
  };
  curl(11.2, 11.4, 0.7, -0.3, INK.bone);
  curl(5.4, 9.8, 0.9, 0.4, INK.candleGold);
  curl(10.3, 5.3, 0.8, 2.6, C.pink);
  curl(9.9, 10.6, 0.6, 0.9, INK.verdigris);
  curl(6.2, 5.5, 0.6, -2.5, INK.bone);
  curl(11.4, 8.2, 0.7, 1.9, INK.bone);
  // A paper crown out of a cracker, flattened.
  const [cX, cY] = P3(11.55, 10.35, 0.02);
  ctx.beginPath();
  ctx.moveTo(cX - 0.2, cY); ctx.lineTo(cX - 0.2, cY - 0.1); ctx.lineTo(cX - 0.12, cY - 0.04); ctx.lineTo(cX - 0.04, cY - 0.13);
  ctx.lineTo(cX + 0.04, cY - 0.04); ctx.lineTo(cX + 0.12, cY - 0.13); ctx.lineTo(cX + 0.19, cY - 0.04); ctx.lineTo(cX + 0.2, cY);
  ctx.closePath();
  paint(ctx, C.pink, { lw: 0.02 });
  // Napkins, dropped as everyone ran in.
  for (const [nx, ny, r] of [[5.5, 10.9, 0.3], [10.1, 11.55, -0.5], [9.9, 5.6, 0.9]]) {
    const [X, Y] = P3(nx, ny, 0.02);
    ctx.save();
    ctx.translate(X, Y);
    ctx.rotate(r);
    ctx.beginPath();
    ctx.moveTo(-0.2, -0.04); ctx.lineTo(0.16, -0.1); ctx.lineTo(0.22, 0.06); ctx.lineTo(0.02, 0.12); ctx.lineTo(-0.18, 0.08);
    ctx.closePath();
    paint(ctx, INK.bone, { lw: 0.02 });
    ctx.restore();
  }
  // The joke out of a cracker: a slip of paper, face up.
  const [jX, jY] = P3(11.5, 11.2, 0.02);
  ctx.save();
  ctx.translate(jX, jY);
  ctx.rotate(0.35);
  ctx.fillStyle = INK.bone;
  ctx.fillRect(-0.14, -0.05, 0.28, 0.1);
  ctx.fillStyle = C.ink;
  ctx.fillRect(-0.1, -0.02, 0.18, 0.012);
  ctx.fillRect(-0.1, 0.01, 0.12, 0.012);
  ctx.restore();
  if (!Q.detail) return;
  // Confetti and crumbs everywhere.
  const cols = [INK.bone, INK.candleGold, INK.verdigris, C.pink, MAT.custard, INK.bone, C.white];
  for (let i = 0; i < 70; i++) {
    const x = x0 + 0.5 + hash(i, 71) * (x1 - x0 - 1), y = y0 + 0.5 + hash(i, 72) * (y1 - y0 - 1);
    if (skip(x, y)) continue;
    const [X, Y] = P3(x, y, 0.02);
    ctx.fillStyle = cols[i % cols.length];
    if (i % 3 === 0) { ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(X - 0.04, Y - 0.022, 0.08, 0.045);
  }
  // A few more round the feathers, so they aren't the only pale spot there.
  for (const [dx, dy, c] of [[-0.45, 0.2, INK.bone], [0.4, -0.1, MAT.custard], [0.2, 0.45, C.white], [-0.3, -0.35, INK.candleGold], [0.5, 0.3, INK.bone]]) {
    const [X, Y] = P3(FEATHERS.x + dx, FEATHERS.y + dy, 0.02);
    ctx.fillStyle = c;
    ctx.fillRect(X - 0.04, Y - 0.022, 0.08, 0.045);
  }
}

// ---------- The mantelpiece ----------
const MANTEL = FIRE.h + 0.18; // the top of the shelf

// The clock on the mantel: its body (static), then its face and hands. It
// kept time until midnight (88 seconds in), and stopped there.
function clockBody(ctx) {
  box(ctx, 0.3, 6.42, MANTEL, 0.38, 0.56, 0.62, MAT.mahogany, { lw: 0.03 });
  onPlane(ctx, 'left', 6.98, 0.68, MANTEL + 0.62, (g) => {
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(0.28, -0.32, 0.56, 0);
    g.closePath();
    paint(g, MAT.mahogany, { lw: 0.03 });
  });
}
function clockFace(ctx, t) {
  const T = lt(t);
  const mins = 720 + Math.min(T, MIDNIGHT) - MIDNIGHT; // a clock minute a second
  onPlane(ctx, 'left', 6.7, 0.69, MANTEL + 0.32, (g) => {
    g.beginPath();
    g.arc(0, 0, 0.19, 0, Math.PI * 2);
    paint(g, INK.bone, { lw: 0.025 });
    const hand = (a, len, lw) => {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
      g.strokeStyle = C.ink;
      g.lineWidth = lw;
      g.lineCap = 'round';
      g.stroke();
    };
    hand(((mins / 60) % 12) / 12 * Math.PI * 2, 0.1, 0.035);
    hand((mins % 60) / 60 * Math.PI * 2, 0.15, 0.025);
  });
}

// The library cat, asleep on the warm mantelpiece. Thunder makes it look up;
// the scream at 95 seconds puts every hair on end.
function cat(ctx, t) {
  const T = lt(t);
  const [X, Y] = P3(0.62, 7.72, MANTEL);
  const scream = T >= 95 && T < 103;
  let startle = 0;
  for (const s of storm.strikes) if (s.big && T - s.t >= 0 && T - s.t < 1.6) startle = 1;
  const breathe = 1 + Math.sin(t * 2.1) * 0.04;
  const fur = C.black;
  ctx.save();
  ctx.translate(X, Y);
  if (scream) {
    // Arched, spiky, tail straight up.
    const jolt = T < 96 ? Math.sin((T - 95) * Math.PI) * 0.25 : 0;
    ctx.translate(0, -jolt);
    ctx.beginPath();
    ctx.moveTo(0.3, -0.34); ctx.quadraticCurveTo(0.34, -0.8, 0.26, -0.95);
    ctx.strokeStyle = fur;
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.25, 0);
    ctx.lineTo(-0.2, -0.3);
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      const r = i % 2 ? 0.3 : 0.38;
      ctx.lineTo(Math.cos(a) * r * 1.05, -0.3 + Math.sin(a) * r * 0.8);
    }
    ctx.lineTo(0.25, 0);
    ctx.closePath();
    paint(ctx, fur, { lw: 0.02, stroke: C.greyLight });
    for (const lx of [-0.24, -0.14, 0.14, 0.24]) { ctx.fillStyle = fur; ctx.fillRect(lx - 0.025, -0.05, 0.05, 0.08); }
    ctx.beginPath();
    ctx.arc(-0.34, -0.42, 0.13, 0, Math.PI * 2);
    ctx.moveTo(-0.44, -0.5); ctx.lineTo(-0.44, -0.66); ctx.lineTo(-0.36, -0.54);
    ctx.moveTo(-0.3, -0.54); ctx.lineTo(-0.24, -0.66); ctx.lineTo(-0.23, -0.5);
    paint(ctx, fur, { lw: 0.02, stroke: C.greyLight });
    ctx.fillStyle = INK.candleGold;
    ctx.beginPath();
    ctx.arc(-0.39, -0.43, 0.035, 0, Math.PI * 2);
    ctx.arc(-0.29, -0.43, 0.035, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Curled up, breathing, the tail hanging over the edge and twitching.
    const tw = Math.sin(t * 3.3) * (Math.sin(t * 0.7) > 0.3 ? 0.18 : 0.03);
    ctx.beginPath();
    ctx.moveTo(0.26, -0.08);
    ctx.quadraticCurveTo(0.52, 0.05, 0.46 + tw, 0.42);
    ctx.strokeStyle = fur;
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -0.14, 0.33, 0.15 * breathe, 0, 0, Math.PI * 2);
    paint(ctx, fur, { lw: 0.02, stroke: C.greyLight });
    const up = startle ? 0.12 : 0;
    ctx.beginPath();
    ctx.arc(-0.27, -0.17 - up, 0.12, 0, Math.PI * 2);
    ctx.moveTo(-0.37, -0.23 - up); ctx.lineTo(-0.38, -0.38 - up); ctx.lineTo(-0.3, -0.27 - up);
    ctx.moveTo(-0.24, -0.28 - up); ctx.lineTo(-0.18, -0.38 - up); ctx.lineTo(-0.17, -0.22 - up);
    paint(ctx, fur, { lw: 0.02, stroke: C.greyLight });
    if (startle) {
      ctx.fillStyle = INK.candleGold;
      ctx.beginPath();
      ctx.arc(-0.32, -0.19 - up, 0.03, 0, Math.PI * 2);
      ctx.arc(-0.22, -0.19 - up, 0.03, 0, Math.PI * 2);
      ctx.fill();
    } else if (Q.detail) {
      ctx.beginPath();
      ctx.moveTo(-0.35, -0.17); ctx.quadraticCurveTo(-0.32, -0.14, -0.29, -0.17);
      ctx.moveTo(-0.25, -0.17); ctx.quadraticCurveTo(-0.22, -0.14, -0.19, -0.17);
      ctx.strokeStyle = C.greyLight;
      ctx.lineWidth = 0.015;
      ctx.stroke();
    }
  }
  ctx.restore();
  // Zzz, while it sleeps.
  if (!scream && !startle && Q.detail) {
    const k = (t * 0.5) % 1;
    const [zX, zY] = P3(0.62, 7.72, MANTEL + 0.35 + k * 0.7);
    ctx.save();
    ctx.globalAlpha *= 1 - k;
    ctx.translate(zX - 0.4 - k * 0.3, zY);
    ctx.scale(1 / 40, 1 / 40);
    ctx.font = `${(0.18 + k * 0.12) * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
    ctx.fillStyle = INK.bone;
    ctx.fillText('z', 0, 0);
    ctx.restore();
  }
}

// Birthday cards along the mantel.
function cards(ctx) {
  const cols = [INK.verdigris, INK.candleGold, INK.bone, C.pink];
  [[5.45, 0.5], [5.8, 0.35], [6.15, 0.55], [7.35, 0.45]].forEach(([u, d], i) => {
    const [X, Y] = P3(d, u, MANTEL);
    ctx.beginPath();
    ctx.moveTo(X - 0.14, Y); ctx.lineTo(X - 0.12, Y - 0.3); ctx.lineTo(X + 0.14, Y - 0.34); ctx.lineTo(X + 0.15, Y - 0.04);
    ctx.closePath();
    paint(ctx, cols[i], { lw: 0.02 });
    if (Q.detail && i === 1) {
      ctx.fillStyle = INK.oxblood;
      ctx.font = '0.14px "Bagel Fat One", "Arial Black", sans-serif';
    }
  });
  if (!Q.detail) return;
  const [X, Y] = P3(0.35, 5.8, MANTEL);
  ctx.save();
  ctx.translate(X + 0.01, Y - 0.17);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${0.13 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK.oxblood;
  ctx.fillText('80', 0, 0);
  ctx.restore();
}

// A stag's head over the mantel, wearing a party hat for the occasion.
function stagHead(ctx) {
  onPlane(ctx, 'left', 7.55, 0.03, 4.55, (g) => {
    const cx = 0.85;
    // The shield it's mounted on.
    g.beginPath();
    g.moveTo(cx - 0.35, 0.85); g.lineTo(cx + 0.35, 0.85); g.lineTo(cx + 0.35, 1.2);
    g.quadraticCurveTo(cx, 1.45, cx - 0.35, 1.2);
    g.closePath();
    paint(g, MAT.mahogany, { lw: 0.03 });
    // Antlers.
    g.beginPath();
    for (const s of [-1, 1]) {
      g.moveTo(cx + s * 0.14, 0.72);
      g.quadraticCurveTo(cx + s * 0.5, 0.55, cx + s * 0.6, 0.05);
      g.moveTo(cx + s * 0.4, 0.5); g.lineTo(cx + s * 0.72, 0.38);
      g.moveTo(cx + s * 0.52, 0.28); g.lineTo(cx + s * 0.4, 0.02);
      g.moveTo(cx + s * 0.58, 0.18); g.lineTo(cx + s * 0.8, 0.02);
    }
    g.lineCap = 'round';
    if (Q.lines) { g.strokeStyle = C.ink; g.lineWidth = 0.1; g.stroke(); }
    g.strokeStyle = INK.bone;
    g.lineWidth = 0.06;
    g.stroke();
    // The head, coming out of the wall at us.
    g.beginPath();
    g.ellipse(cx, 0.95, 0.2, 0.28, 0, 0, Math.PI * 2);
    paint(g, MAT.fur, { lw: 0.03, dots: MAT.furDark, density: 0.2 });
    g.beginPath();
    g.ellipse(cx, 1.16, 0.12, 0.1, 0, 0, Math.PI * 2);
    paint(g, mix(MAT.fur, INK.bone, 0.4), { lw: 0.025 });
    g.fillStyle = C.ink;
    g.beginPath();
    g.arc(cx - 0.09, 0.9, 0.035, 0, Math.PI * 2);
    g.arc(cx + 0.09, 0.9, 0.035, 0, Math.PI * 2);
    g.arc(cx, 1.18, 0.04, 0, Math.PI * 2);
    g.fill();
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + s * 0.25, 0.78, 0.12, 0.06, s * -0.5, 0, Math.PI * 2);
      paint(g, MAT.fur, { lw: 0.025 });
    }
    // The hat.
    g.beginPath();
    g.moveTo(cx - 0.12, 0.72); g.lineTo(cx + 0.03, 0.3); g.lineTo(cx + 0.14, 0.74);
    g.closePath();
    paint(g, C.pink, { lw: 0.025, dots: C.mustard, density: 0.4 });
  });
}

// ---------- The portrait over the fireplace ----------
// Lord Gooseworth in his prime, monocle and all (the monocle the goose ends up
// wearing), up where the gallery can't hide him. His painted eyes look down at
// the spot by the table where the goose stood at midnight. They don't move: the
// portrait whose eyes follow you is the one in the hall.
const PORTRAIT = { u: 5.2, z: 7.75, w: 2.2, h: 3.1 };
const portraitEyes = () => [-0.025, 0.05];
function portrait(ctx, t) {
  const { u, z, w, h } = PORTRAIT;
  onPlane(ctx, 'left', u + w, 0.02, z + h, (g) => {
    const cx = w / 2;
    // A gilt frame, and a dark ground to paint him on (as painting() in the style sheet).
    g.beginPath();
    g.rect(-0.22, -0.22, w + 0.44, h + 0.44);
    paint(g, MAT.brass, { lw: 0.035, dots: MAT.brassDark, density: 0.25 });
    g.beginPath();
    g.rect(0, 0, w, h);
    paint(g, MAT.velvetDark, { lw: 0.025, dots: shade(MAT.velvetDark, 0.35), density: 0.15 });
    g.save();
    g.beginPath();
    g.rect(0, 0, w, h);
    g.clip();
    // Velvet coat, a white cravat, the gold chain of office.
    g.beginPath();
    g.moveTo(0.15, h); g.lineTo(0.45, 2.15); g.quadraticCurveTo(cx, 1.95, w - 0.45, 2.15); g.lineTo(w - 0.15, h);
    g.closePath();
    paint(g, MAT.velvet, { lw: 0.03, dots: shade(MAT.velvet, 0.4), density: 0.2 });
    g.beginPath();
    g.moveTo(cx - 0.26, 2.05); g.lineTo(cx + 0.26, 2.05); g.lineTo(cx, 2.65);
    g.closePath();
    paint(g, INK.bone, { lw: 0.025 });
    g.beginPath();
    g.moveTo(0.55, 2.3); g.quadraticCurveTo(cx, 2.95, w - 0.55, 2.3);
    g.strokeStyle = INK.candleGold;
    g.lineWidth = 0.06;
    g.stroke();
    // His head: pink, bald, whiskered.
    g.beginPath();
    g.ellipse(cx, 1.4, 0.5, 0.62, 0, 0, Math.PI * 2);
    paint(g, SKIN[5], { lw: 0.03 });
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + s * 0.44, 1.62, 0.2, 0.34, s * 0.25, 0, Math.PI * 2);
      paint(g, INK.bone, { lw: 0.02 });
      g.beginPath();
      g.ellipse(cx + s * 0.2, 1.17, 0.14, 0.05, s * -0.2, 0, Math.PI * 2);
      g.fillStyle = INK.bone;
      g.fill();
    }
    // A mustache, and a nose that's been at the port.
    g.beginPath();
    g.moveTo(cx, 1.66);
    g.quadraticCurveTo(cx - 0.2, 1.58, cx - 0.36, 1.76);
    g.quadraticCurveTo(cx - 0.15, 1.74, cx, 1.72);
    g.quadraticCurveTo(cx + 0.15, 1.74, cx + 0.36, 1.76);
    g.quadraticCurveTo(cx + 0.2, 1.58, cx, 1.66);
    paint(g, INK.bone, { lw: 0.02 });
    g.beginPath();
    g.arc(cx, 1.52, 0.08, 0, Math.PI * 2);
    g.fillStyle = mix(SKIN[5], INK.oxblood, 0.45);
    g.fill();
    // The eyes, which move.
    const [dx, dy] = portraitEyes(t);
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + s * 0.2, 1.3, 0.1, 0.07, 0, 0, Math.PI * 2);
      paint(g, INK.bone, { lw: 0.02 });
      g.beginPath();
      g.arc(cx + s * 0.2 + dx, 1.3 + dy * 0.6, 0.045, 0, Math.PI * 2);
      g.fillStyle = C.ink;
      g.fill();
    }
    // The monocle, on its chain.
    g.beginPath();
    g.arc(cx + 0.2, 1.3, 0.14, 0, Math.PI * 2);
    g.strokeStyle = INK.candleGold;
    g.lineWidth = 0.04;
    g.stroke();
    g.beginPath();
    g.moveTo(cx + 0.33, 1.36); g.quadraticCurveTo(cx + 0.5, 1.9, cx + 0.3, 2.2);
    g.lineWidth = 0.02;
    g.stroke();
    g.restore();
  });
}

// ---------- Pidge's evidence ----------
// He measured the rug. "Hmm. Six feet." He re-measures while he stands there
// (26 to 30 seconds); the rest of the evening his tape is left lying out.
const TAPE = { x0: 9.95, x1: 12.35, y: 9.25 };
function tape(ctx, t) {
  const T = lt(t);
  let k = 1;
  if (T >= 26.5 && T < 27) k = 1 - (T - 26.5) / 0.5;
  else if (T >= 27 && T < 29.5) k = (T - 27) / 2.5;
  const { x0, x1, y } = TAPE;
  const end = x1 - (x1 - x0) * k;
  // The tape.
  ctx.beginPath();
  const a = P3(end, y - 0.06, 0.02), b = P3(x1, y - 0.06, 0.02), c = P3(x1, y + 0.06, 0.02), d = P3(end, y + 0.06, 0.02);
  quad(ctx, a, b, c, d);
  paint(ctx, INK.candleGold, { lw: 0.02 });
  if (Q.detail) {
    ctx.beginPath();
    for (let u = x1 - 0.2; u > end; u -= 0.2) { const p = P3(u, y - 0.06, 0.02), q = P3(u, y, 0.02); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.015;
    ctx.stroke();
  }
  // The hook at the end, and the case.
  const [hX, hY] = P3(end, y, 0.02);
  ctx.fillStyle = MAT.silver;
  ctx.fillRect(hX - 0.04, hY - 0.08, 0.06, 0.1);
  const [cX, cY] = P3(x1 + 0.2, y, 0.12);
  ctx.beginPath();
  ctx.ellipse(cX, cY, 0.2, 0.16, 0, 0, Math.PI * 2);
  paint(ctx, INK.oxblood, { lw: 0.03 });
  ctx.beginPath();
  ctx.arc(cX, cY, 0.06, 0, Math.PI * 2);
  paint(ctx, MAT.silver, { lw: 0.02 });
}

// Chalk on the floorboards, and his numbered evidence markers: none of them
// next to anything that matters.
function chalk(ctx) {
  if (!Q.detail) return;
  ctx.save();
  const [X, Y] = P3(13.4, 8.55, 0);
  ctx.transform(1, 0.5, -1, 0.5, X, Y);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${0.42 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = alpha(INK.bone, 0.75);
  ctx.fillText('6 FT?', 0, 0);
  ctx.restore();
  const p = P3(12.55, 8.8, 0), q = P3(12.85, 8.62, 0);
  ctx.beginPath();
  ctx.moveTo(q[0], q[1]); ctx.lineTo(p[0], p[1]);
  ctx.strokeStyle = alpha(INK.bone, 0.75);
  ctx.lineWidth = 0.04;
  ctx.stroke();
}
function marker(ctx, x, y, n) {
  const [X, Y] = P3(x, y, 0);
  ctx.beginPath();
  ctx.moveTo(X - 0.17, Y); ctx.lineTo(X - 0.12, Y - 0.3); ctx.lineTo(X + 0.12, Y - 0.3); ctx.lineTo(X + 0.17, Y);
  ctx.closePath();
  paint(ctx, INK.candleGold, { lw: 0.025 });
  if (!Q.detail) return;
  ctx.save();
  ctx.translate(X, Y - 0.14);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${0.2 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.ink;
  ctx.fillText(String(n), 0, 0);
  ctx.restore();
}

// Pidge's blackboard of suspects, on an easel by the bookcases.
const BOARD = { x0: 1.2, x1: 3.0, y: 13.9 };
function blackboard(ctx) {
  const { x0, x1, y } = BOARD;
  const legs = [[x0 + 0.15, y + 0.25], [x1 - 0.15, y + 0.25], [(x0 + x1) / 2, y - 0.45]];
  ctx.beginPath();
  for (const [lx, ly] of legs) {
    const a = P3(lx, ly, 0), b = P3(lx + (lx < (x0 + x1) / 2 ? 0.1 : -0.1), y, 2.4);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.strokeStyle = MAT.oak;
  ctx.lineWidth = 0.06;
  ctx.stroke();
  wface(ctx, 'right', x0 - 0.08, y, 0.92, x1 - x0 + 0.16, 1.5, MAT.oak, { lw: 0.03 });
  wface(ctx, 'right', x0, y + 0.01, 1.0, x1 - x0, 1.34, mix(INK.verdigris, C.black, 0.55), { lw: 0.02 });
  if (!Q.detail) return;
  const chalkC = alpha(INK.bone, 0.85);
  planeText(ctx, 'right', (x0 + x1) / 2, y + 0.02, 2.12, 'SUSPECTS', 0.22, chalkC);
  planeText(ctx, 'right', (x0 + x1) / 2, y + 0.02, 1.8, '1. BEAR', 0.19, chalkC);
  planeText(ctx, 'right', (x0 + x1) / 2, y + 0.02, 1.52, '2. BUTLER', 0.19, chalkC);
  planeText(ctx, 'right', (x0 + x1) / 2, y + 0.02, 1.24, '3. BEAR AGAIN', 0.19, chalkC);
  // A chalk tray, and the chalk.
  wbox(ctx, 'right', x0, y, 0.9, x1 - x0, 0.16, 0.05, MAT.oak, { flat: true, lw: 0.02 });
}

// ---------- The bunting ----------
// HAPPY 80TH, strung across the room from gallery to gallery.
const BUNTING = { a: [2.35, 12.6, GAL + 1.0], b: [12.6, 2.35, GAL + 1.0], sag: 1.9 };
function bunting(ctx, t) {
  const { a, b, sag } = BUNTING;
  const text = ' HAPPY 80TH! ';
  const n = text.length + 1;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const s = Math.sin(k * Math.PI) * (sag + Math.sin(t * 0.8) * 0.06);
    pts.push(P3(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - s));
  }
  ctx.beginPath();
  pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
  ctx.strokeStyle = INK.bone;
  ctx.lineWidth = 0.035;
  ctx.stroke();
  const cols = [INK.verdigris, INK.candleGold, INK.bone, C.pink];
  for (let i = 1; i < n; i++) {
    const [X0, Y0] = pts[i];
    const sw = Math.sin(t * 2.2 + i * 0.9) * 0.06;
    ctx.beginPath();
    ctx.moveTo(X0 - 0.3, Y0 - 0.02); ctx.lineTo(X0 + 0.3, Y0 + 0.02); ctx.lineTo(X0 + sw, Y0 + 0.72);
    ctx.closePath();
    const c = cols[i % cols.length];
    paint(ctx, c, { lw: 0.025 });
    const ch = text[i - 1];
    if (Q.detail && ch && ch !== ' ') {
      ctx.save();
      ctx.translate(X0 + sw * 0.4, Y0 + 0.22);
      ctx.scale(1 / 40, 1 / 40);
      ctx.font = `${0.28 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = c === INK.bone || c === INK.candleGold ? INK.oxblood : INK.bone;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
  }
}

// ---------- More furniture ----------
// A library ladder, from the floor up to the gallery rail.
function ladder(ctx, x0, y, x1, z1) {
  const rails = [[-0.28, 0], [0.28, 0]];
  ctx.beginPath();
  for (const [dy] of rails) { const a = P3(x0, y + dy, 0), b = P3(x1, y + dy, z1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  for (let k = 0.08; k < 0.97; k += 0.085) {
    const a = P3(x0 + (x1 - x0) * k, y - 0.28, z1 * k), b = P3(x0 + (x1 - x0) * k, y + 0.28, z1 * k);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke(); }
  ctx.strokeStyle = MAT.oak;
  ctx.lineWidth = 0.07;
  ctx.stroke();
}

// A globe on a stand. It turns, slowly.
function globe(ctx, x, y, t, r = 0.45) {
  const [X, Y] = P3(x, y, 0);
  ctx.beginPath();
  ctx.moveTo(X - 0.35, Y); ctx.lineTo(X, Y - 0.55); ctx.lineTo(X + 0.35, Y);
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.strokeStyle = MAT.mahogany;
  ctx.lineWidth = 0.06;
  ctx.stroke();
  const cY = Y - 0.55 - r;
  ctx.beginPath();
  ctx.arc(X, cY, r, 0, Math.PI * 2);
  paint(ctx, mix(INK.verdigris, INK.bone, 0.35), { lw: 0.03 });
  // Continents, sliding round as it turns.
  ctx.save();
  ctx.beginPath();
  ctx.arc(X, cY, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = MAT.oakLight;
  const spin = t * 0.25;
  for (let i = 0; i < 4; i++) {
    const lon = ((spin + i * 1.7) % (Math.PI * 2)) - Math.PI;
    const px = Math.sin(lon) * r, vis = Math.cos(lon);
    if (vis < 0) continue;
    ctx.beginPath();
    ctx.ellipse(X + px, cY - r * 0.3 + (i % 2) * r * 0.55, 0.12 * vis + 0.02, 0.16, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(X, cY, r + 0.07, Math.PI * 0.6, Math.PI * 2.1);
  ctx.strokeStyle = MAT.brass;
  ctx.lineWidth = 0.05;
  ctx.stroke();
}

// Books stacked on the floor, the way libraries always end up.
function floorBooks(ctx, x, y, n, seed) {
  for (let i = 0; i < n; i++) {
    const c = SPINES[(seed + i * 3) % SPINES.length];
    const off = (hash(seed, i) - 0.5) * 0.12;
    box(ctx, x - 0.3 + off, y - 0.22 - off, i * 0.11, 0.6, 0.44, 0.11, c, { flat: true, lw: 0.02, top: i === n - 1 ? PAGES : c });
  }
}

export default {
  id: 'library',
  name: 'Library',
  blurb: 'Lord Gooseworth, face down in his own birthday trifle. Inspector Pidge is questioning the bear.',

  build(R) {
    // ---------- The room ----------
    R.floor((ctx) => {
      slab(ctx, RM.floor);
      planks(ctx, RM.floor, 0.7);
      rect(ctx, 0, 0, 16, 16, 0, null, { dots: shade(RM.floor, 0.4), density: 0.12, stroke: false });
    });
    R.walls({
      left: RM.wall, right: shade(RM.wall, 0.14), cap: INK.bone, cut: INK.stormNavy,
      dotsL: shade(RM.wall, 0.4), dotsR: shade(RM.wall, 0.45), densL: 0.14, densR: 0.16,
      doors: DOORS.library || [],
    });
    // Wallpaper: a darker stripe, and a cornice under the top.
    R.wall((ctx) => {
      if (!Q.detail) return;
      for (const side of ['left', 'right']) {
        ctx.beginPath();
        for (let u = 0.2; u < 16; u += 0.7) quad(ctx, SP(side, u, 0, 0), SP(side, u + 0.22, 0, 0), SP(side, u + 0.22, 0, H), SP(side, u, 0, H));
        ctx.fillStyle = alpha(shade(RM.wall, 0.3), 0.5);
        ctx.fill();
        wface(ctx, side, 0, 0, H - 0.5, 16, 0.3, RM.trim, { stroke: false });
      }
    });

    // ---------- Books, two storeys of them ----------
    const cases = [
      makeCase('right', 1, 6.4, 11, { special: { '3,1': 'skull', '8,0': 'eyes', '10,2': 'bird' }, labels: [[1, 0, 'MYSTERY'], [1, 1, 'MORE MYSTERY'], [4, 2, 'POISONS A-Z']] }),
      makeCase('right', 9.8, 15, 12, { special: { '2,1': 'urn', '4,0': 'empty', '9,2': 'skull', '11,1': 'bird' }, labels: [[4, 0, 'SOLVED'], [2, 2, 'TRIFLE'], [6, 1, 'GEESE']] }),
      makeCase('left', 1, 4.6, 13, { special: { '5,1': 'eyes', '9,0': 'urn' }, labels: [[3, 0, 'BEARS'], [3, 1, 'WILLS']] }),
      makeCase('left', 8.8, 15, 14, { special: { '1,2': 'bird', '3,0': 'skull', '8,1': 'eyes', '11,2': 'urn' }, labels: [[2, 1, 'TAXIDERMY'], [4, 2, '1974']] }),
    ];
    R.decor((ctx) => {
      drawCase(ctx, cases[0]);
      drawCase(ctx, cases[1]);
      drawCase(ctx, cases[2]);
      fireplace(ctx);
      drawCase(ctx, cases[3]);
    });

    // ---------- The window and the fire ----------
    R.decor((ctx, t) => { drawWindow(ctx, t); drawDrapes(ctx, t); }, { anim: true });
    R.decor((ctx, t) => drawFire(ctx, t), { anim: true });
    fire(R, 0.9, 6.7, 0.6, 3, 3.6);
    candle(R, 0.55, 5.2, FIRE.h + 0.18, 5);
    candle(R, 0.55, 8.2, FIRE.h + 0.18, 6);

    // ---------- The gallery ----------
    R.thing(1, 1, (ctx) => drawGallery(ctx), { depth: 2 });

    // ---------- The floor ----------
    R.rug((ctx) => drawRug(ctx));
    R.rug((ctx) => { partyMess(ctx); feathers(ctx); });
    // The end of the goose's trail: the last floury prints, in from the dining
    // room door, to where it stood at midnight (they show up in the lightning).
    const prints = [];
    for (let i = 0, x = 15.7; x > 11.7; i++, x -= 0.42) prints.push([x, 10.05 + (i % 2 ? 0.11 : -0.11) + (15.7 - x) * 0.05, (15.7 - x) / 4]);
    R.rug((ctx) => {
      if (!Q.detail) return;
      for (const [x, y, k] of prints) webPrint(ctx, x, y, Math.PI, alpha(C.white, 0.2 - 0.1 * k), alpha(C.white, 0.3 - 0.15 * k), 0.34);
    });
    R.rug((ctx, t) => {
      const k = pastK(t);
      if (!(k > 0.02) || !Q.detail) return;
      for (const [x, y] of prints) webPrint(ctx, x, y, Math.PI, alpha(C.white, 0.55 * k), alpha(C.white, 0.8 * k), 0.36);
    }, { anim: true });

    // ---------- The scene ----------
    R.thing(TABLE.x1, TABLE.y1, (ctx, t) => tableScene(ctx, t));
    R.thing(4.8, 11.8, (ctx, t) => bear(ctx, t), { anim: true });
    R.thing(3.5, 6.3, (ctx) => armchair(ctx, 5.2));
    R.thing(3.5, 8.3, (ctx) => armchair(ctx, 7.2));
    R.thing(SIDE.x + 0.5, SIDE.y + 0.5, (ctx) => {
      sideTable(ctx);
      wineGlass(ctx, 13.05, 4.15, SIDE.h + 0.08);
      wineGlass(ctx, 12.35, 4.4, SIDE.h + 0.08, { fill: 0.45 });
    });
    // More glasses from the toast, put down wherever: by an armchair, on a
    // pile of books, halfway up the ladder (none of them hers).
    R.thing(3.75, 8.8, (ctx) => wineGlass(ctx, 3.75, 8.8, 0, { fill: 0.3 }));
    // And one more of his pill bottles, dropped under the table's corner.
    R.thing(6.2, 9.7, (ctx) => pillBottle(ctx, 6.2, 9.7, 0.09, { rot: 0.5 }));
    lamp(R, 14.4, 3.0, { h: 2.7 });
    candle(R, 8.34, 7.16, TABLE.h + 0.643, 11);
    candle(R, 8.55, 6.95, TABLE.h + 0.893, 12);
    candle(R, 8.76, 6.74, TABLE.h + 0.643, 13);

    // ---------- The mantelpiece and the portrait ----------
    // A clock that stopped at midnight, birthday cards, and the Lord over it all.
    R.decor((ctx) => { clockBody(ctx); cards(ctx); wineGlass(ctx, 0.7, 7.85, MANTEL); portrait(ctx, 0); });
    R.decor((ctx, t) => clockFace(ctx, t), { anim: true });

    // ---------- The party that was ----------
    // (The balloons are on the Lord's empty chair in the dining room, and the
    // hall's newel post: here it's just the bunting.)
    R.thing(7.5, 7.5, (ctx, t) => bunting(ctx, t), { anim: true, depth: 32 });

    // ---------- Pidge's investigation ----------
    // He measured the rug ("Hmm. Six feet."), numbered the wrong things, and
    // put the bear at the top of his list twice.
    R.rug((ctx) => chalk(ctx));
    R.rug((ctx, t) => tape(ctx, t), { anim: true });
    for (const [x, y, n] of [[14.2, 9.5, 1], [5.6, 3.6, 2], [14.6, 12.2, 3], [2.3, 9.9, 4]]) R.thing(x, y, (ctx) => marker(ctx, x, y, n));
    R.thing(BOARD.x1, BOARD.y + 0.3, (ctx) => blackboard(ctx));

    // ---------- Library things ----------
    R.thing(4.4, 3.3, (ctx) => { ladder(ctx, 4.4, 3.3, 2.4, GAL + 1.05); wineGlass(ctx, 3.9, 3.3, 2.04, { fill: 0.2 }); });
    R.thing(5.2, 1.9, (ctx, t) => globe(ctx, 5.2, 1.9, t), { anim: true });
    R.thing(11.4, 1.8, (ctx) => floorBooks(ctx, 11.4, 1.8, 5, 3));
    R.thing(1.9, 9.6, (ctx) => floorBooks(ctx, 1.9, 9.6, 3, 7));
    R.thing(14.3, 7.6, (ctx) => { floorBooks(ctx, 14.3, 7.6, 4, 11); wineGlass(ctx, 14.25, 7.55, 0.44, { fill: 0.6 }); });

    R.dark(house.dark);

    // ---------- Finds ----------
    R.find({ id: 'feathers', label: 'Goose feathers on the rug', at: [FEATHERS.x, FEATHERS.y, 0.05], r: 0.65 });
    R.find({ id: 'pill-bottle', label: 'A pill bottle with beak marks', at: [PILLS.x, PILLS.y, PILLS.z], r: 0.6 });
    R.find({ id: 'lipstick-glass', label: 'A wine glass with lipstick', at: [LIPSTICK.x, LIPSTICK.y, LIPSTICK.z + 0.3], r: 0.6 });
  },
};
