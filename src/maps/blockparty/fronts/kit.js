// The rooms' street fronts: what each room shows the street, drawn in the
// room itself (so it comes and goes with the room), on the street side of its
// door. The rooms are The Block's own files; a front is added to one on this
// map only (map.js), so The Block keeps looking as it did.
//
// Each room's file (fronts/<id>.js) draws its own front. This kit is what
// two or more of them share: the OPEN / CLOSED card, a window's sky by the
// hour, and the rush-hour extras who walk in as a room gets busy.
import { C, Q, P, onLeft, paint, person, folk, speech, mix } from '../../../engine/art.js';
import { clamp } from '../../../engine/actors.js';
import { board } from '../style.js';
import { open, rush } from '../clock.js';

// OPEN or CLOSED on a front, on the room's hours: the same card on every
// door on the block. Two still cards, one shown at a time (so nothing is
// redrawn each frame). along, x, y, z: as board(); at: where it sorts.
export function openCard(R, id, along, x, y, z, at = [x + 0.01, y + 0.01], o = {}) {
  const card = (on) => (ctx) => board(ctx, along, x, y, z, o.w || 0.95, 0.4, on ? 'OPEN' : 'CLOSED', { board: on ? C.butter : C.greyLight, ink: C.ink, size: o.size || 0.22, edge: 0.03 });
  R.thing(at[0], at[1], card(true), { on: (t) => open(id, t) > 0.5, ...(o.depth != null && { depth: o.depth }) });
  R.thing(at[0], at[1], card(false), { on: (t) => open(id, t) <= 0.5, ...(o.depth != null && { depth: o.depth }) });
}

// The sky by the hour, for a window: navy night, a blush dawn, day blue, the
// party's pink sunset, a purple dusk, on the paper's hours (style.js PAPER).
// Steps of a twentieth keep the color mixes few.
const SKY = [[0, C.night], [4.5, C.night], [6, C.blush], [8, C.sky], [17, C.sky], [19, C.pink], [20, C.pink], [21, C.purple], [22, C.night], [24, C.night]];
export function skyAt(h) {
  for (let i = 1; i < SKY.length; i++) {
    const [h0, c0] = SKY[i - 1], [h1, c1] = SKY[i];
    if (h <= h1) return mix(c0, c1, Math.round(((h - h0) / (h1 - h0)) * 20) / 20);
  }
  return C.night;
}
// A window pane on the left wall (y0 along it, z0 up, w by hh) painted with
// the hour's sky: the sun crossing it by day, the moon and three stars by
// night, and the rooftops across the street along the bottom.
export function skyPane(ctx, y0, z0, w, hh, h) {
  onLeft(ctx, y0, z0, w, hh, skyAt(h), { stroke: false });
  const dark = h < 5.5 || h > 20.5;
  const k = clamp((h - 6) / 14);
  const sy = dark ? y0 + w * 0.72 : y0 + w * (0.85 - 0.7 * k);
  const sz = dark ? z0 + hh * 0.72 : z0 + hh * (0.35 + 0.4 * Math.sin(k * Math.PI));
  const [X, Y] = P(0, sy, sz);
  ctx.beginPath(); ctx.arc(X, Y, Math.min(0.34, w * 0.08), 0, Math.PI * 2);
  paint(ctx, dark ? C.butter : h > 17.5 ? C.coral : C.mustard, { lw: 0.03 });
  if (dark && Q.detail) {
    ctx.fillStyle = C.white;
    for (const [u, v] of [[0.15, 0.8], [0.35, 0.55], [0.5, 0.85]]) {
      const [sx, sy2] = P(0, y0 + w * u, z0 + hh * v);
      ctx.fillRect(sx - 0.05, sy2 - 0.05, 0.1, 0.1);
    }
  }
  const roof = dark ? C.ink : mix(C.navy, C.lilac, 0.5);
  for (let i = 0; i * 0.9 < w - 0.3; i++) onLeft(ctx, y0 + 0.1 + i * 0.9, z0, 0.75, 0.3 + ((i * 37) % 5) * 0.12, roof, { stroke: false });
}

// Rush hour extras, for any room's front: each walks in along its path as the room's
// rush builds and back out as it fades (one with a single spot just fades in
// and out). Nothing is drawn outside the rush. m: { path, seed, dir, back,
// pose, top, hat, arms, scale, z, delay (0 to 0.5: who's first), say(t),
// prop(ctx, p, t), under(ctx, t), draw(ctx, t, p) instead of a person }.
// level(t): how busy (0 to 1), the room's rush unless it says otherwise.
export function extras(R, ID, list, level = (t) => rush(ID, t)) {
  for (const m of list) {
    const path = m.path, segs = [];
    let L = 0;
    for (let k = 1; k < path.length; k++) { segs.push(Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1])); L += segs[k - 1]; }
    const end = path[path.length - 1];
    const off = { x: end[0], y: end[1], k: 0 };
    const q = (t) => clamp((level(t) - (m.delay || 0)) / (1 - (m.delay || 0)));
    R.mover((t) => {
      const k = q(t);
      if (k <= 0) return off;
      if (k >= 1 || !L) return { x: end[0], y: end[1], k };
      let s = k * L, j = 0;
      while (j < segs.length - 1 && s > segs[j]) { s -= segs[j]; j++; }
      const a = path[j], b = path[j + 1], f = Math.min(1, s / segs[j]);
      const out = level(t + 0.1) < level(t);
      const dx = (b[0] - a[0]) * (out ? -1 : 1), dy = (b[1] - a[1]) * (out ? -1 : 1);
      return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, k, walk: true, dir: dx - dy > 0 ? 'r' : 'l', back: dx + dy < 0 };
    }, (ctx, t, p) => {
      if (!p.k) return;
      ctx.save();
      ctx.globalAlpha = L ? clamp(p.k * L / 0.6) : p.k;
      if (m.under && !p.walk) m.under(ctx, t);
      if (m.draw) m.draw(ctx, t, p);
      else {
        const pose = p.walk ? 'walk' : typeof m.pose === 'function' ? m.pose(t) : m.pose || 'stand';
        person(ctx, p.x, p.y, m.z || 0, folk(m.seed, {
          pose, dir: p.walk ? p.dir : m.dir, back: p.walk ? p.back : m.back,
          top: m.top, hat: m.hat, scale: m.scale, arms: p.walk || pose !== (m.pose || 'stand') ? undefined : m.arms,
        }), t);
      }
      if (!p.walk && m.prop) m.prop(ctx, p, t);
      ctx.restore();
      const say = !p.walk && m.say && Q.detail ? m.say(t) : null;
      if (say) speech(ctx, p.x, p.y, (m.z || 0) + 2.7 * (m.scale || 1), say, { size: 0.4 });
    });
  }
}
