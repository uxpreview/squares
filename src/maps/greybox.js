// The greybox kit: plain shapes for laying a level out before the art (see
// docs/PROCESS.md, step 4). A greybox area shows where everything goes (the
// floor, walls and doors, the hero, furniture, paths, where people stand, the
// finds) as flat blocks with labels, so the layout can be judged and changed
// while it's cheap. Area artists later replace all of it with art, keeping the
// layout, the doors and the finds.
//
// Everything takes the zone builder R (see src/engine/zone.js) and works in the
// zone's own units: x, y from its back corner, z up.

import {
  C, Q, box, rect, paint, paintText, person, slab, tiles, onLeft, onRight, alpha, tint,
} from '../engine/art.js';
import { ZK } from '../engine/iso.js';

// A room's shell: the slab, a flat floor, the engine's walls (with doors, cut
// down in the overview on maps with walls down) and the room's name painted on
// the floor, so the plan reads from far out.
// o: { floor, slab (a color, or false outdoors), grid, name, nameAt: [x, y],
//      walls: { left, right, h, doors, ... } | false }
export function shell(R, o = {}) {
  const floor = o.floor || C.greyLight;
  R.floor((ctx) => {
    if (o.slab !== false) slab(ctx, o.slab || floor);
    rect(ctx, 0, 0, R.S, R.S, 0, floor, { stroke: false });
    if (o.grid !== false) tiles(ctx, o.grid || 2, alpha(C.ink, 0.1), 0.03);
  });
  if (o.walls !== false) R.walls(o.walls || {});
  if (o.name) {
    const [nx, ny] = o.nameAt || [8, 14.6];
    R.rug((ctx) => paintText(ctx, 'floor', nx, ny, o.name, o.nameSize || 1.1, alpha(C.ink, 0.28)));
  }
}

// A plain block standing on the floor: furniture, a hero, a machine. (x, y) is
// its back corner, w runs along x, d along y, h up. name: a small label on it.
// o: { z, dots, depth, anim, top, size }
export function block(R, x, y, w, d, h, color, name, o = {}) {
  const z = o.z || 0;
  const opts = { anim: !!o.anim };
  if (o.depth != null) opts.depth = o.depth;
  R.thing(x + w / 2, y + d / 2, (ctx) => drawBlock(ctx, x, y, z, w, d, h, color, name, o), opts);
}

// The same block, drawn directly (for things that move: pass it to R.mover).
export function drawBlock(ctx, x, y, z, w, d, h, color, name, o = {}) {
  box(ctx, x, y, z, w, d, h, color, { flat: !o.dots, top: o.top });
  if (name && Q.detail) tag(ctx, x + w / 2, y + d / 2, z + h + 0.5, name, { size: o.size });
}

// A small upright label on a paper chip, facing the viewer. Reads on any floor.
export function tag(ctx, x, y, z, text, o = {}) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const size = o.size || 0.46;
  const k = 40;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `700 ${size * k}px "Rethink Sans", system-ui, sans-serif`;
  const w = ctx.measureText(text).width + size * k * 0.9;
  const h = size * k * 1.45;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = o.fill || C.white;
  ctx.fill();
  if (Q.lines) {
    ctx.lineWidth = 0.05 * k;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  ctx.fillStyle = o.color || C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * k * 0.06);
  ctx.restore();
}

// A find, stood in for by a numbered pin with its tip on the spot. (The
// greybox shows where finds go, not what they look like.) Pins draw over
// everything so they're never hidden. find: { id, label, at, r }; n: its number.
export function pin(R, find, n, o = {}) {
  R.find(find);
  const color = o.color || C.coral;
  R.air((ctx, t) => {
    const [x, y, z] = typeof find.at === 'function' ? find.at(t) : find.at;
    const X = x - y, Y = (x + y) / 2 - z * ZK;
    ctx.save();
    ctx.translate(X, Y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-0.22, -0.3, -0.4, -0.5, -0.4, -0.78);
    ctx.arc(0, -0.78, 0.4, Math.PI, 0);
    ctx.bezierCurveTo(0.4, -0.5, 0.22, -0.3, 0, 0);
    paint(ctx, color, { lw: 0.06 });
    const k = 40;
    ctx.scale(1 / k, 1 / k);
    ctx.font = `700 ${0.5 * k}px "Rethink Sans", system-ui, sans-serif`;
    ctx.fillStyle = C.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 0, -0.78 * k + 1);
    ctx.restore();
  });
}

// Someone standing (or sitting) still, with their name over their head.
// look: a person style (see folk() in art.js). o: { z, pose, dir, back }
export function figure(R, x, y, look, name, o = {}) {
  const z = o.z || 0;
  R.thing(x, y, (ctx, t) => {
    person(ctx, x, y, z, { pose: o.pose || 'stand', dir: o.dir || 'r', back: o.back, ...look }, t);
    if (name && Q.detail) tag(ctx, x, y, z + (o.pose === 'sit' ? 2.4 : 3.0), name, { size: 0.4 });
  }, { anim: true });
}

// Stairs: `steps` solid steps rising `rise` units over the block (x, y, w, d).
// up: the way you climb: '-x' (toward the left wall), '+x', '-y' or '+y'.
export function stairs(R, x, y, w, d, o = {}) {
  const n = o.steps || 10, rise = o.rise || 3, up = o.up || '-x', color = o.color || C.wood;
  for (let i = 0; i < n; i++) {
    let bx = x, by = y, bw = w, bd = d;
    if (up === '-x') { bw = w / n; bx = x + w - (i + 1) * bw; }
    if (up === '+x') { bw = w / n; bx = x + i * bw; }
    if (up === '-y') { bd = d / n; by = y + d - (i + 1) * bd; }
    if (up === '+y') { bd = d / n; by = y + i * bd; }
    const h = rise * (i + 1) / n;
    R.thing(bx + bw / 2, by + bd / 2, (ctx) => box(ctx, bx, by, 0, bw, bd, h, color, { flat: true, top: tint(color, 0.12) }));
  }
  if (o.name) R.air((ctx) => { if (Q.detail) tag(ctx, x + w / 2, y + d / 2, rise + 0.6, o.name); });
}

// A window on a back wall: frame and glass. glass(t) gives the glass color
// right now (a stormy night, a flash of lightning); side: 'left' or 'right'.
export function pane(R, side, u, z, w, h, glass, frame = C.white) {
  const f = side === 'left' ? onLeft : onRight;
  R.decor((ctx, t) => {
    f(ctx, u - 0.15, z - 0.15, w + 0.3, h + 0.3, frame);
    f(ctx, u, z, w, h, glass(t));
    f(ctx, u + w / 2 - 0.05, z, 0.1, h, frame, { stroke: false });
    f(ctx, u, z + h / 2 - 0.05, w, 0.1, frame, { stroke: false });
  }, { anim: true });
}

// The routes of the map's walkers through this zone, as dashed lines on the
// floor, with a dot wherever someone stops. Shows the evening at a glance.
// o: { loop (seconds, default the walker's own), step, alpha }
export function paths(R, o = {}) {
  const [ox, oy, oz] = R.origin;
  const lines = [];
  const stops = [];
  for (const wk of R.walkers) {
    const loop = o.loop || wk.loop || 180;
    let cur = null;
    let still = false;
    for (let t = 0; t <= loop; t += o.step || 0.25) {
      const p = wk.at(t);
      if (R.contains(p.x, p.y, p.z || 0)) {
        const q = [p.x - ox, p.y - oy, (p.z || 0) - oz];
        (cur = cur || []).push(q);
        if (!p.moving && !still) stops.push([...q, wk.color || C.ink]);
        still = !p.moving;
      } else if (cur) {
        lines.push([cur, wk.color || C.ink]);
        cur = null;
      }
    }
    if (cur) lines.push([cur, wk.color || C.ink]);
  }
  R.rug((ctx) => {
    if (!Q.detail) return;
    ctx.save();
    ctx.setLineDash([0.35, 0.3]);
    ctx.lineWidth = 0.09;
    ctx.lineCap = 'round';
    for (const [pts, color] of lines) {
      ctx.beginPath();
      pts.forEach(([x, y, z], i) => {
        const X = x - y, Y = (x + y) / 2 - z * ZK;
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      });
      ctx.strokeStyle = alpha(color, o.alpha ?? 0.7);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const [x, y, z, color] of stops) {
      ctx.beginPath();
      ctx.ellipse(x - y, (x + y) / 2 - z * ZK, 0.5, 0.25, 0, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(color, 0.8);
      ctx.lineWidth = 0.08;
      ctx.stroke();
    }
    ctx.restore();
  });
}
