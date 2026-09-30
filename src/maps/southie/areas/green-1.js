// The Landlady: the Green House's first floor (docs/levels/southie.md).
// Fifty-two years in the house, not moving. Rosebud wallpaper, a couch still
// in its plastic, doilies on everything, the Red Sox on at night (no logos),
// a police scanner on the windowsill narrating the street, a hall of every
// tenant she's ever had, the calendar with SEPT 1 circled, a percolator, a
// cat, a budgie, her friend Dot at the kitchen table all day with scratch
// tickets, and her nephew's legs under the sink.
// She herself is on the day's clock (day.js): at her table, up the stairs
// for the inspection from 11, out at her card table on the porch at noon
// handing out keys to a queue in the rain, back by one.
// The goose is the porch goose: she brought it in out of the rain, and she
// dresses it for the weather (a hard hat for moving day, a sou'wester in the
// rain, a ball cap for the game, a nightcap).
//
// The whole house is one hand: the helpers the other two floors use (a
// talk bubble, a window in the back wall, a sofa, a sleeper under a blanket,
// a pigeon, an umbrella, a cat, the hours) are exported from here.
import {
  C, Q, box, rect, disc, cylinder, face, paint, person, folk, speech, shade, tint, mix, alpha,
  onLeft, onRight, P, paintText, chair, label, note,
} from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { particles, clamp } from '../../../engine/actors.js';
import { apartment, lettering, umbrella, pigeon, cat } from '../kit.js';
// The neighborhood's umbrella, pigeon and cat are the kit's now; the other
// rooms still ask for them here.
export { umbrella, pigeon, cat };
import { SIDING, TRIM, ROOM, BRAND, lightsOn } from '../style.js';
import { hour, rainK, nightK } from '../clock.js';

// ---------- Shared by the Green House's three floors ----------
// The hour, with the small hours after midnight running on past 24.
export const hh = (t) => { const h = hour(t); return h < 5 ? h + 24 : h; };
// Between hour a and b (hours after midnight as 24 and up).
export const hours = (a, b) => (t) => { const h = hh(t); return h >= a && h < b; };
// The old tenants' side of the day, and the new ones'.
export const oldSide = hours(5, 12);
export const newSide = hours(13, 29);

// A talk bubble that comes and goes: lines said in turn, each for `on`
// seconds out of every `every`.
export function says(ctx, x, y, z, t, lines, every = 7, on = 3.2, off = 0, size = 0.4) {
  const tt = t + off, i = Math.floor(tt / every), p = tt - i * every;
  if (p > on || !Q.detail || p < 0) return;
  speech(ctx, x, y, z, lines[((i % lines.length) + lines.length) % lines.length], { size });
}

// A line through points in the zone's units.
export function line3(ctx, pts, color, lw = 0.05) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(...p); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
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
// the day's sky, the house behind, and rain running down it.
export function backWindow(R, y, z, w, h, o = {}) {
  R.decor((ctx) => {
    onLeft(ctx, y - 0.2, z - 0.2, w + 0.4, h + 0.4, C.white, { lw: 0.04 });
    onLeft(ctx, y - 0.35, z - 0.34, w + 0.7, 0.16, C.white, { lw: 0.03 });
  });
  R.decor((ctx, t) => {
    const sky = skyAt(t), n = nightK(t);
    onLeft(ctx, y, z, w, h, sky, { lw: 0.03 });
    onLeft(ctx, y + w * 0.4, z, w * 0.6, h * 0.5, mix(tint(C.mustard, 0.3), C.night, n * 0.55), { stroke: false });
    if (n > 0.3) onLeft(ctx, y + w * 0.6, z + h * 0.14, w * 0.2, h * 0.18, C.butter, { stroke: false });
    face(ctx, [[0, y + w / 2, z], [0, y + w / 2, z + h]], null, { lw: 0.08, stroke: C.white });
    face(ctx, [[0, y, z + h / 2], [0, y + w, z + h / 2]], null, { lw: 0.08, stroke: C.white });
  }, { anim: true, step: skyStep });
  if (o.noRain) return;
  R.thing(0.02, y + w, (ctx, t) => {
    const k = rainK(t);
    if (k < 0.05 || !Q.detail) return;
    ctx.strokeStyle = alpha(C.white, 0.7); ctx.lineWidth = 0.035; ctx.lineCap = 'round';
    particles(t, Math.round(5 * k) + 2, 1.4, (a, r) => {
      const u = y + 0.1 + r() * (w - 0.2), v = z + h - 0.1 - a * (h - 0.2);
      const [X0, Y0] = P(0.01, u, v), [X1, Y1] = P(0.01, u, v - 0.22);
      ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
    }, Math.round(y * 10) + 3);
  }, { anim: true, on: (t) => rainK(t) >= 0.05 });
}

// A sofa, its back along y and facing +y, from (x, y), w long along x.
export function sofa(ctx, x, y, w, color, o = {}) {
  const d = o.d || 1.2;
  box(ctx, x, y, 0, w, d, 0.5, shade(color, 0.12), { lw: 0.04 });
  box(ctx, x + 0.25, y + 0.3, 0.5, w - 0.5, d - 0.3, 0.22, tint(color, 0.08), { lw: 0.03 });
  if (Q.detail) face(ctx, [[x + w / 2, y + 0.3, 0.721], [x + w / 2, y + d, 0.721]], null, { lw: 0.03, stroke: shade(color, 0.35) });
  box(ctx, x, y, 0.5, w, 0.32, 0.75, color, { lw: 0.04 });
  box(ctx, x, y + 0.3, 0.5, 0.26, d - 0.3, 0.4, color, { lw: 0.035 });
  box(ctx, x + w - 0.26, y + 0.3, 0.5, 0.26, d - 0.3, 0.4, color, { lw: 0.035 });
}

// Someone asleep under a blanket, lying along x: the head on a pillow at
// (x, y, z), the blanket running on toward +x for len. o: { hair, skin,
// blanket, breath (0..1), mask (a sleep mask), mouth (snoring) }.
export function sleeper(ctx, x, y, z, len, o = {}) {
  const bl = o.blanket || C.teal, b = (o.breath || 0) * 0.05;
  // The pillow, the head, the blanket over the rest.
  box(ctx, x - 0.35, y - 0.4, z, 0.7, 0.8, 0.18, C.white, { flat: true, lw: 0.03 });
  const [X, Y] = P(x, y, z + 0.38);
  ctx.beginPath(); ctx.arc(X, Y, 0.3, 0, Math.PI * 2); paint(ctx, o.skin || mix(C.blush, C.wood, 0.4), { lw: 0.035 });
  ctx.beginPath(); ctx.arc(X - 0.05, Y - 0.06, 0.31, Math.PI * 0.95, Math.PI * 2.05); ctx.fillStyle = o.hair || C.brown; ctx.fill();
  if (o.mask) {
    ctx.beginPath(); ctx.roundRect(X - 0.24, Y - 0.06, 0.48, 0.17, 0.06); paint(ctx, o.mask, { lw: 0.025 });
    if (Q.detail) {
      // Eyes printed on it, wide open.
      for (const dx of [-0.11, 0.11]) { ctx.beginPath(); ctx.ellipse(X + dx, Y + 0.025, 0.07, 0.05, 0, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill(); ctx.beginPath(); ctx.arc(X + dx + 0.015, Y + 0.03, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); }
    }
  } else if (Q.detail) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.moveTo(X - 0.12, Y + 0.02); ctx.lineTo(X - 0.02, Y + 0.02); ctx.moveTo(X + 0.06, Y + 0.02); ctx.lineTo(X + 0.16, Y + 0.02); ctx.stroke();
    if (o.mouth) { ctx.beginPath(); ctx.ellipse(X + 0.03, Y + 0.14, 0.05, 0.03 + b, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); }
  }
  box(ctx, x + 0.3, y - 0.55, z + 0.02, len, 1.1, 0.34 + b, bl, { lw: 0.035, top: tint(bl, 0.1), dens: 0.15 });
  if (Q.detail) face(ctx, [[x + 0.3, y - 0.55, z + 0.37 + b], [x + 0.3, y + 0.55, z + 0.37 + b]], null, { lw: 0.06, stroke: C.white });
}




// Someone on hour keyframes: [[hour, x, y, z?], ...]; between two frames
// they walk (or, if z changes, hop). Returns (t) => { x, y, z, dir, moving }.
export function onHours(frames) {
  return (t) => {
    const h = hh(t);
    let i = 1;
    while (i < frames.length && h > frames[i][0]) i++;
    if (i >= frames.length) { const f = frames[frames.length - 1]; return { x: f[1], y: f[2], z: f[3] || 0, moving: false, ahead: (f[3] || 0) > 0.5 ? 1.6 : 0 }; }
    const a = frames[i - 1], b = frames[i];
    if (h <= a[0]) return { x: a[1], y: a[2], z: a[3] || 0, moving: false, ahead: (a[3] || 0) > 0.5 ? 1.6 : 0 };
    const k = (h - a[0]) / (b[0] - a[0] || 1);
    const still = a[1] === b[1] && a[2] === b[2] && (a[3] || 0) === (b[3] || 0);
    const za = a[3] || 0, zb = b[3] || 0;
    const hop = za !== zb ? Math.sin(Math.PI * clamp(k * 1.5 - 0.25)) * 0.6 : 0;
    const sx = (b[1] - b[2]) - (a[1] - a[2]);
    const z = za + (zb - za) * k + hop;
    return { x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k, z, moving: !still, dir: sx >= 0 ? 'r' : 'l', ahead: Math.max(za, zb) > 0.5 ? 1.6 : 0 };
  };
}

// ---------- The Landlady ----------
const W = ROOM['green-1'];
const MAUVE = mix(C.pink, C.purple, 0.35);
const DOT = folk(72, { style: 'curly', hair: C.greyLight, top: C.pink, bottom: C.navy, dress: true, skin: mix(C.blush, C.white, 0.4) });
const NEPHEW = { top: C.red, bottom: mix(C.sky, C.navy, 0.35) };
// The noon queue for keys, in front of the bay in the rain: the night nurse
// for the second floor, the couple from out of state for the third, and one
// of the roommates bringing his key back.
const QUEUE = [
  { x: 14.35, y: 5.0, look: folk(211, { style: 'bun', top: C.tealLight, bottom: C.tealLight, shoes: C.white }), umb: C.pink, line: 'Second floor. Nights.' },
  { x: 14.3, y: 6.0, look: folk(233, { style: 'short', top: C.grey, bottom: C.ink, hat: 'beanie' }), umb: C.teal, line: 'We drove all night.' },
  { x: 14.4, y: 6.75, look: folk(234, { style: 'long', top: C.mustard, bottom: C.navy }), umb: null, line: 'It\'s seventy-two inches.' },
  { x: 14.35, y: 7.7, look: folk(12, { top: C.coral, bottom: C.grey, hat: 'cap' }), umb: null, line: 'About the wall.' },
];
const noon = hours(11.85, 13.05);
const INK_HARDHAT = C.mustard;

export default {
  id: 'green-1',
  name: 'The Landlady',
  blurb: 'Fifty-two years on the first floor and every key on one ring. She is not moving; everyone else is.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 0, walls: W, floorInk: W.floor, siding: SIDING.green, trim: TRIM.green, label: 'Green House' });

    // ---------- The floor ----------
    R.floor((ctx) => {
      // The kitchen's lino: white and mint, the edge worn.
      rect(ctx, 0.02, 2.02, 4.16, 6.96, 0.005, C.white, { stroke: false });
      for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) if ((i + j) % 2) rect(ctx, 0.02 + i * 0.693, 2.02 + j * 0.696, 0.693, 0.696, 0.006, tint(C.teal, 0.6), { stroke: false });
      if (!Q.detail) return;
      // The wall-to-wall carpet's pile, in rows.
      ctx.save(); ctx.globalAlpha *= 0.18;
      for (let y = 2.3; y < 9; y += 0.35) face(ctx, [[4.25, y, 0.004], [12.45, y, 0.004], [12.45, y + 0.04, 0.004], [4.25, y + 0.04, 0.004]], C.purple, { stroke: false });
      ctx.restore();
    });
    // The clear plastic runner from the door to the kitchen (the carpet is
    // from 1979 and looks it, except here), and the braided rug.
    R.rug((ctx) => {
      rect(ctx, 2.1, 2.05, 10.3, 0.85, 0.008, alpha(C.white, 0.45), { lw: 0.02, stroke: alpha(C.ink, 0.4) });
      if (Q.detail) { ctx.save(); ctx.globalAlpha *= 0.4; for (let x = 2.4; x < 12.3; x += 0.9) line3(ctx, [[x, 2.15, 0.01], [x + 0.35, 2.8, 0.01]], C.white, 0.04); ctx.restore(); }
      const cx = 10.4, cy = 5.0;
      for (const [r, c] of [[1.6, C.coral], [1.3, C.mustard], [1.0, C.teal], [0.7, C.coral], [0.4, C.mustard]]) {
        const [X, Y] = P(cx, cy, 0.01);
        ctx.beginPath(); ctx.ellipse(X, Y, r * 1.35, r * 0.62, 0, 0, Math.PI * 2);
        paint(ctx, c, { lw: 0.02, dots: shade(c, 0.3), density: 0.15 });
      }
    });

    // ---------- The walls ----------
    // Rosebud wallpaper above a chair rail, and a band below.
    R.decor((ctx) => {
      onLeft(ctx, 0, 0, 9, 1.05, shade(W.left, 0.08), { stroke: false });
      onRight(ctx, 0, 0, 12.5, 1.05, shade(W.right, 0.08), { stroke: false });
      onLeft(ctx, 0, 1.05, 9, 0.1, C.white, { stroke: false });
      onRight(ctx, 0, 1.05, 12.5, 0.1, C.white, { stroke: false });
      if (!Q.detail) return;
      ctx.save(); ctx.globalAlpha *= 0.5;
      for (let u = 0.3; u < 12.4; u += 0.6) {
        onRight(ctx, u, 1.15, 0.06, 3.25, tint(C.pink, 0.2), { stroke: false });
        if (u < 9) onLeft(ctx, u, 1.15, 0.06, 3.25, tint(C.pink, 0.2), { stroke: false });
      }
      ctx.restore();
      for (let u = 0.6; u < 12.4; u += 0.6) for (let z = 1.5; z < 4.3; z += 0.5) {
        const o = ((Math.round(u / 0.6) + Math.round(z / 0.5)) % 2) * 0.25;
        const draw = (pt) => { const [X, Y] = P(...pt); ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill(); ctx.beginPath(); ctx.arc(X + 0.06, Y + 0.05, 0.03, 0, Math.PI * 2); ctx.fillStyle = C.green; ctx.fill(); };
        draw([u, 0, z + o]);
        if (u < 9) draw([0, u, z + o]);
      }
    });

    // The hall of tenants: fifty-two years of them, framed up the hall
    // along the stairs, with a plaque, and an empty frame for this year.
    R.decor((ctx) => {
      onRight(ctx, 1.0, 3.95, 1.5, 0.34, C.brown, { lw: 0.03 });
      paintText(ctx, 'right', 1.75, 4.12, 'MY TENANTS', 0.2, C.butter, 'Bagel Fat One');
      let i = 0;
      const eras = [mix(C.coral, C.mustard, 0.5), C.greyLight, tint(C.sky, 0.3), mix(C.mustard, C.white, 0.5), tint(C.teal, 0.5), C.grey, tint(C.pink, 0.4)];
      for (let x = 1.0; x < 7.0; x += 0.62) for (const z of [1.5, 2.25, 3.0]) {
        i++;
        const w = 0.44 + (i % 3) * 0.05, h = 0.52 - (i % 2) * 0.08, xx = x + ((i * 7) % 5) * 0.02, zz = z + ((i * 3) % 4) * 0.04;
        const fr = [C.brown, C.mustard, C.ink, C.white][i % 4];
        onRight(ctx, xx - 0.05, zz - 0.05, w + 0.1, h + 0.1, fr, { lw: 0.02 });
        onRight(ctx, xx, zz, w, h, eras[i % eras.length], { stroke: false });
        if (!Q.detail) continue;
        // One tenant or two, heads and shoulders.
        const n = i % 4 === 0 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const cx = xx + w * (n === 1 ? 0.5 : 0.32 + k * 0.36);
          onRight(ctx, cx - 0.1, zz, 0.2, 0.14, [C.coral, C.navy, C.teal, C.purple, C.red][(i + k) % 5], { stroke: false });
          const [X, Y] = P(cx, 0, zz + 0.26); ctx.beginPath(); ctx.arc(X, Y, 0.075, 0, Math.PI * 2);
          ctx.fillStyle = [C.blush, C.wood, C.brown, mix(C.blush, C.white, 0.4)][(i + k) % 4]; ctx.fill();
          ctx.beginPath(); ctx.arc(X, Y - 0.03, 0.08, Math.PI, Math.PI * 2); ctx.fillStyle = [C.ink, C.brown, C.mustard, C.red][(i * 3 + k) % 4]; ctx.fill();
        }
      }
      // This year's: an empty frame, a sticky note in it.
      onRight(ctx, 7.45, 3.0, 0.6, 0.62, C.mustard, { lw: 0.02 });
      onRight(ctx, 7.5, 3.05, 0.5, 0.52, tint(W.right, 0.4), { stroke: false });
      if (Q.detail) { onRight(ctx, 7.58, 3.15, 0.34, 0.3, C.butter, { lw: 0.015 }); paintText(ctx, 'right', 7.75, 3.3, '2026', 0.1, C.ink, 'Rethink Sans'); }
      // A cross-stitch over the couch.
      onRight(ctx, 9.9, 2.55, 1.3, 0.9, C.wood, { lw: 0.03 });
      onRight(ctx, 10.0, 2.65, 1.1, 0.7, C.white, { stroke: false });
      paintText(ctx, 'right', 10.55, 3.12, 'NO', 0.16, C.red, 'Rethink Sans');
      paintText(ctx, 'right', 10.55, 2.9, 'SUBLETTING', 0.13, C.red, 'Rethink Sans');
      if (Q.detail) for (let u = 10.1; u < 11.05; u += 0.16) { const [X, Y] = P(u, 0, 2.72); ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fillStyle = C.green; ctx.fill(); }
    });

    // ---------- The kitchen (along the back wall) ----------
    backWindow(R, 2.6, 1.8, 1.3, 1.4);
    // Lace cafe curtains on the window.
    R.decor((ctx) => {
      onLeft(ctx, 2.45, 1.75, 1.6, 0.75, alpha(C.white, 0.85), { lw: 0.02 });
      if (Q.detail) for (let u = 2.55; u < 4.0; u += 0.2) { const [X, Y] = P(0, u, 1.8); ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI); ctx.strokeStyle = alpha(C.ink, 0.35); ctx.lineWidth = 0.015; ctx.stroke(); }
    });
    // The calendar: a lighthouse on top, SEPTEMBER, the 1st circled in red.
    R.decor((ctx) => {
      const y0 = 5.95, z0 = 1.75;
      onLeft(ctx, y0, z0, 1.0, 1.4, C.white, { lw: 0.025 });
      onLeft(ctx, y0 + 0.05, z0 + 0.8, 0.9, 0.55, tint(C.sky, 0.2), { stroke: false });
      onLeft(ctx, y0 + 0.05, z0 + 0.8, 0.9, 0.15, tint(C.teal, 0.3), { stroke: false });
      onLeft(ctx, y0 + 0.45, z0 + 0.9, 0.1, 0.35, C.white, { lw: 0.012 });
      onLeft(ctx, y0 + 0.45, z0 + 1.1, 0.1, 0.06, C.red, { stroke: false });
      lettering(ctx, 'y', 0.005, y0 + 0.5, z0 + 0.7, 'SEPTEMBER', 0.1, C.ink);
      if (!Q.detail) return;
      ctx.strokeStyle = alpha(C.ink, 0.45); ctx.lineWidth = 0.012; ctx.beginPath();
      for (let i = 0; i <= 5; i++) { const [a, b] = P(0, y0 + 0.08, z0 + 0.08 + i * 0.1), [c, d] = P(0, y0 + 0.92, z0 + 0.08 + i * 0.1); ctx.moveTo(a, b); ctx.lineTo(c, d); }
      for (let i = 0; i <= 7; i++) { const [a, b] = P(0, y0 + 0.08 + i * 0.12, z0 + 0.08), [c, d] = P(0, y0 + 0.08 + i * 0.12, z0 + 0.58); ctx.moveTo(a, b); ctx.lineTo(c, d); }
      ctx.stroke();
      const [X, Y] = P(0, y0 + 0.38, z0 + 0.53);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.13, 0.1, -0.4, 0, Math.PI * 2); ctx.strokeStyle = C.red; ctx.lineWidth = 0.035; ctx.stroke();
      paintText(ctx, 'left', y0 + 0.62, z0 - 0.12, 'KEYS NOON!', 0.09, C.red, 'Rethink Sans');
    });
    // The wall phone, its cord down to the floor and back.
    R.decor((ctx) => {
      onLeft(ctx, 7.12, 1.9, 0.3, 0.55, C.mustard, { lw: 0.025 });
      onLeft(ctx, 7.08, 2.35, 0.38, 0.12, shade(C.mustard, 0.15), { lw: 0.02 });
      if (!Q.detail) return;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) { const k = i / 30, [X, Y] = P(0.05, 7.27 + Math.sin(k * 40) * 0.04, 1.9 - k * 1.3 + Math.sin(k * Math.PI) * -0.2); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
      ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.025; ctx.stroke();
    });
    // The sink counter (her nephew's under it), the stove, the fridge.
    R.thing(1.1, 4.5, (ctx) => {
      box(ctx, 0, 2.2, 0, 1.1, 2.3, 1.15, C.white, { lw: 0.04, top: tint(C.coral, 0.45) });
      if (Q.detail) for (const u of [3.35]) face(ctx, [[1.1, u, 0.1], [1.1, u, 1.0]], null, { lw: 0.025 });
      rect(ctx, 0.2, 3.3, 0.7, 0.8, 1.151, shade(C.greyLight, 0.15), { lw: 0.025 });
      rect(ctx, 0.28, 3.38, 0.54, 0.64, 1.152, shade(C.grey, 0.2), { stroke: false });
      box(ctx, 0.05, 3.62, 1.15, 0.12, 0.08, 0.55, C.greyLight, { flat: true, lw: 0.02 });
      box(ctx, 0.05, 3.62, 1.65, 0.42, 0.08, 0.08, C.greyLight, { flat: true, lw: 0.02 });
      // The kitchen radio.
      box(ctx, 0.2, 4.15, 1.15, 0.5, 0.3, 0.32, C.coral, { flat: true, lw: 0.025 });
      if (Q.detail) { disc(ctx, 0.45, 4.46, 1.3, 0.08, C.ink, { stroke: false }); }
    });
    // The sink cabinet doors, open: the nephew's under there (before three).
    R.thing(1.2, 3.4, (ctx) => {
      face(ctx, [[1.1, 2.3, 0.1], [1.7, 2.1, 0.1], [1.7, 2.1, 1.0], [1.1, 2.3, 1.0]], C.white, { lw: 0.025 });
      face(ctx, [[1.1, 3.3, 0.1], [1.1, 2.4, 0.1], [1.1, 2.4, 1.0], [1.1, 3.3, 1.0]], shade(C.ink, 0.2), { lw: 0.025 });
    }, { on: hours(7.5, 15) });
    R.thing(2.4, 3.2, (ctx, t) => {
      // Legs out from under the sink, one knee up and jiggling.
      const k = Math.sin(t * 2.2) * 0.12;
      for (const pts of [[[1.1, 2.7, 0.2], [1.8, 2.7, 0.18], [2.4, 2.7, 0.12]], [[1.1, 3.0, 0.2], [1.6, 3.0, 0.8 + k], [2.0, 3.0, 0.12]]]) {
        line3(ctx, pts, C.ink, 0.28);
        line3(ctx, pts, NEPHEW.bottom, 0.2);
      }
      disc(ctx, 2.5, 2.7, 0.12, 0.12, C.white, { lw: 0.02 });
      disc(ctx, 2.1, 3.0, 0.12, 0.12, C.white, { lw: 0.02 });
      // His toolbox, a wrench out on the lino, a bucket.
      box(ctx, 1.5, 3.45, 0, 0.7, 0.35, 0.35, C.red, { flat: true, lw: 0.025 });
      box(ctx, 1.75, 3.55, 0.35, 0.2, 0.1, 0.1, C.ink, { flat: true, stroke: false });
      line3(ctx, [[2.3, 3.6, 0.03], [2.7, 3.4, 0.03]], C.grey, 0.06);
      cylinder(ctx, 1.4, 4.2, 0, 0.22, 0.35, C.sky);
      says(ctx, 2.2, 2.9, 1.3, t, hh(t) > 14.3 ? ['Fixed, Auntie.'] : ['It\'s the washer, Auntie.', 'Almost.', 'Who put this in?', 'It\'s not the washer.'], 9, 3, 2);
    }, { anim: true, on: hours(7.5, 15) });
    // After he's gone, the faucet drips into a pot. Fixed.
    R.thing(1.0, 3.9, (ctx, t) => {
      box(ctx, 0.35, 3.45, 1.15, 0.4, 0.4, 0.25, C.greyLight, { flat: true, lw: 0.02 });
      const k = (t % 1.6) / 1.6;
      if (k < 0.5) disc(ctx, 0.5, 3.66, 1.72 - k * 0.8, 0.04, C.sky, { lw: 0.01 });
      else if (Q.detail && k < 0.65) label(ctx, 0.3, 3.4, 1.9, 'plink', 0.18, C.ink, 'Rethink Sans');
    }, { anim: true, on: hours(15, 29) });
    // The deposits: an old coffee can on the counter, DEPOSITS on masking
    // tape, bills sticking out of the slot in its lid.
    R.thing(0.95, 2.95, (ctx) => {
      cylinder(ctx, 0.6, 2.75, 1.15, 0.2, 0.42, C.red, { top: C.greyLight });
      if (!Q.detail) return;
      lettering(ctx, 'x', 0.6, 2.96, 1.46, 'COFFEE', 0.07, C.white);
      face(ctx, [[0.46, 2.955, 1.25], [0.78, 2.955, 1.25], [0.78, 2.955, 1.36], [0.46, 2.955, 1.36]], tint(C.butter, 0.5), { lw: 0.01 });
      lettering(ctx, 'x', 0.62, 2.965, 1.305, 'DEPOSITS', 0.055, C.ink);
      box(ctx, 0.52, 2.7, 1.57, 0.2, 0.05, 0.14, C.leaf, { flat: true, lw: 0.012 });
      box(ctx, 0.6, 2.76, 1.57, 0.14, 0.04, 0.1, C.green, { flat: true, lw: 0.012 });
    });
    // The stove, and the percolator on it (its glass knob bubbling).
    R.thing(1.1, 5.6, (ctx) => {
      box(ctx, 0, 4.5, 0, 1.1, 1.1, 1.15, C.white, { lw: 0.04, top: shade(C.white, 0.08) });
      if (Q.detail) {
        for (const [u, v] of [[4.75, 0.3], [5.25, 0.3], [4.75, 0.8], [5.25, 0.8]]) disc(ctx, v, u, 1.152, 0.16, C.ink, { stroke: false });
        face(ctx, [[1.1, 4.62, 0.2], [1.1, 5.48, 0.2], [1.1, 5.48, 0.8], [1.1, 4.62, 0.8]], shade(C.greyLight, 0.1), { lw: 0.025 });
      }
      box(ctx, 0, 4.5, 1.15, 0.12, 1.1, 0.35, C.white, { flat: true, lw: 0.03 });
      // The percolator.
      cylinder(ctx, 0.55, 5.25, 1.15, 0.17, 0.62, C.greyLight, { top: shade(C.greyLight, 0.1) });
      box(ctx, 0.64, 5.22, 1.4, 0.2, 0.06, 0.28, C.ink, { flat: true, stroke: false });
    });
    R.thing(1.12, 5.7, (ctx, t) => {
      const [X, Y] = P(0.55, 5.25, 1.83);
      ctx.beginPath(); ctx.arc(X, Y, 0.09, Math.PI, 0); paint(ctx, alpha(tint(C.sky, 0.5), 0.9), { lw: 0.02 });
      const on = hours(6, 11)(t) || hours(14.5, 17.5)(t);
      if (!on || !Q.detail) return;
      if (Math.sin(t * 9) > 0) { ctx.beginPath(); ctx.arc(X, Y - 0.03, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.brown; ctx.fill(); }
      particles(t, 4, 2.4, (k, r) => {
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.beginPath(); ctx.arc(X + Math.sin(k * 6 + r() * 6) * 0.1, Y - 0.2 - k * 1.1, 0.05 + k * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = C.white; ctx.fill();
        ctx.globalAlpha = 1;
      }, 11);
    }, { anim: true });
    // The fridge: round-shouldered, mint, covered in magnets and Mass cards.
    R.thing(1.2, 8.9, (ctx) => {
      box(ctx, 0.05, 7.6, 0, 1.15, 1.25, 3.0, tint(C.mint, 0.2), { lw: 0.045 });
      face(ctx, [[1.2, 7.65, 2.0], [1.2, 8.8, 2.0]], null, { lw: 0.04 });
      box(ctx, 1.2, 8.6, 1.2, 0.08, 0.1, 0.6, C.greyLight, { flat: true, lw: 0.02 });
      box(ctx, 1.2, 8.6, 2.15, 0.08, 0.1, 0.5, C.greyLight, { flat: true, lw: 0.02 });
      if (!Q.detail) return;
      for (const [u, v, c] of [[7.8, 2.5, C.coral], [8.1, 2.3, C.teal], [7.9, 1.5, C.mustard], [8.3, 1.2, C.pink], [7.75, 0.8, C.white], [8.2, 2.7, C.purple]]) {
        face(ctx, [[1.21, u, v], [1.21, u + 0.18, v], [1.21, u + 0.18, v + 0.24], [1.21, u, v + 0.24]], c, { lw: 0.015 });
      }
      // A cat bowl beside it.
    });
    R.rug((ctx) => {
      disc(ctx, 1.6, 4.9 + 0.35, 0.01, 0.22, C.teal, { lw: 0.02 });
      disc(ctx, 1.6, 5.25, 0.02, 0.13, C.brown, { stroke: false });
    });
    // The kitchen table: chrome legs, a speckled top. Dot's scratch tickets,
    // her coffee, the landlady's empty chair.
    R.thing(3.2, 7.3, (ctx) => {
      for (const [lx, ly] of [[2.0, 6.15], [2.95, 6.15], [2.0, 7.05], [2.95, 7.05]]) box(ctx, lx, ly, 0, 0.08, 0.08, 1.05, C.greyLight, { flat: true, lw: 0.015 });
      box(ctx, 1.85, 6.0, 1.05, 1.3, 1.2, 0.1, C.white, { lw: 0.03, top: tint(C.coral, 0.6), dotsT: C.coral, densT: 0.15 });
      chair(ctx, 3.15, 6.25, 0, C.red, 'l');
    });
    R.thing(3.25, 7.35, (ctx) => {
      // Tickets, scratched and not; the cup; a sugar bowl.
      const tk = [[2.1, 6.3, C.mustard], [2.4, 6.2, C.teal], [2.2, 6.7, C.pink], [2.65, 6.55, C.mustard], [2.45, 6.95, C.green]];
      for (const [u, v, c] of tk) rect(ctx, u, v, 0.28, 0.2, 1.16, c, { lw: 0.012 });
      if (Q.detail) for (const [u, v] of tk.slice(0, 3)) rect(ctx, u + 0.05, v + 0.05, 0.16, 0.08, 1.165, C.greyLight, { stroke: false });
      cylinder(ctx, 2.9, 6.3, 1.15, 0.1, 0.16, C.white);
      cylinder(ctx, 2.9, 6.85, 1.15, 0.12, 0.18, C.pink, { top: C.white });
    });
    // Dot: scratching, commenting, at the table from seven till the game.
    R.thing(1.6, 6.9, (ctx) => chair(ctx, 0.95, 6.2, 0, C.red, 'r'), {});
    R.mover((t) => (hours(7, 20.5)(t) ? { x: 1.45, y: 6.62 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      const sc = Math.sin(t * 14) * 0.15;
      person(ctx, p.x, p.y, 0.12, {
        ...DOT, pose: 'sit', dir: 'r', arms: [1.3 + sc, 0.9],
        face: (c, hy) => { c.strokeStyle = C.ink; c.lineWidth = 0.025; c.beginPath(); c.arc(0.12, hy + 0.02, 0.07, 0, Math.PI * 2); c.moveTo(0.33, hy + 0.02); c.arc(0.26, hy + 0.02, 0.07, 0, Math.PI * 2); c.stroke(); },
      }, t);
      const h = hh(t);
      const lines = h < 9 ? ['Fifty-two years, same day.', 'Two dollars. Again.'] : h < 12 ? ['Is that a couch?', 'In my day you carried it.', 'Two dollars!'] : h < 15.4 ? ['Look at them. Soaked.', 'Nothing. Again.'] : ['That one\'s a nurse. Nice.', 'They\'ll never get it up.', 'Five dollars!'];
      says(ctx, p.x, p.y, 2.5, t, lines, 11, 3.4, 6);
    }, { bias: 0.6 });
    // The budgie: a cage on a stand, singing all day, covered at night.
    R.thing(3.9, 8.5, (ctx) => {
      box(ctx, 3.55, 8.15, 0, 0.6, 0.6, 0.06, C.ink, { flat: true, stroke: false });
      box(ctx, 3.82, 8.42, 0.06, 0.06, 0.06, 1.7, C.mustard, { flat: true, lw: 0.015 });
    });
    R.thing(3.95, 8.55, (ctx, t) => {
      const [X, Y] = P(3.85, 8.45, 1.75);
      // The perch and the bird, bobbing.
      const b = Math.abs(Math.sin(t * 3)) * 0.05;
      ctx.beginPath(); ctx.moveTo(X - 0.2, Y - 0.3); ctx.lineTo(X + 0.2, Y - 0.3); ctx.strokeStyle = C.brown; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(X, Y - 0.42 - b, 0.09, 0.13, 0.3, 0, Math.PI * 2); paint(ctx, C.leaf, { lw: 0.02 });
      ctx.beginPath(); ctx.arc(X + 0.05, Y - 0.56 - b, 0.07, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.02 });
      ctx.fillStyle = C.ink; ctx.fillRect(X + 0.07, Y - 0.58 - b, 0.02, 0.02);
      // The cage: a dome of bars.
      ctx.beginPath(); ctx.ellipse(X, Y - 0.05, 0.38, 0.12, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
      ctx.strokeStyle = C.white; ctx.lineWidth = 0.025; ctx.beginPath();
      for (let i = -3; i <= 3; i++) { const u = i * 0.11; ctx.moveTo(X + u, Y - 0.05); ctx.quadraticCurveTo(X + u * 0.9, Y - 0.85, X, Y - 0.95); }
      ctx.stroke();
      if (Q.detail && Math.sin(t * 1.1) > 0.2) note(ctx, 3.85 + ((t * 0.5) % 1) * 0.5, 8.1, 3.0 + ((t * 0.5) % 1) * 0.5, C.green, 0.6);
    }, { anim: true, on: hours(6.5, 21.5) });
    R.thing(3.95, 8.55, (ctx) => {
      const [X, Y] = P(3.85, 8.45, 1.75);
      ctx.beginPath(); ctx.moveTo(X - 0.42, Y); ctx.quadraticCurveTo(X - 0.4, Y - 1.0, X, Y - 1.02); ctx.quadraticCurveTo(X + 0.4, Y - 1.0, X + 0.42, Y); ctx.closePath();
      paint(ctx, C.purple, { lw: 0.03, dots: shade(C.purple, 0.4), density: 0.2 });
    }, { on: (t) => !hours(6.5, 21.5)(t) });

    // A mouse that lives behind the fridge, out for Dot's crumbs now and
    // then. The cat has never once noticed.
    R.mover((t) => {
      const p = t % 23;
      if (p > 6) return { x: -99, y: -99 };
      const k = p < 3 ? p / 3 : (6 - p) / 3;
      return { x: 1.35 + k * 0.9, y: 7.5 - k * 0.35, dir: p < 3 ? 'r' : 'l' };
    }, (ctx, t, p) => {
      if (p.x < -50 || !Q.detail) return;
      const [X, Y] = P(p.x, p.y, 0);
      ctx.save(); ctx.translate(X, Y); ctx.scale(p.dir === 'l' ? -1 : 1, 1);
      ctx.beginPath(); ctx.ellipse(0, -0.08, 0.14, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.grey, { lw: 0.02 });
      ctx.beginPath(); ctx.arc(0.1, -0.15, 0.04, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.015 });
      ctx.beginPath(); ctx.moveTo(-0.14, -0.06); ctx.quadraticCurveTo(-0.3, -0.02, -0.34, -0.12); ctx.strokeStyle = C.pink; ctx.lineWidth = 0.02; ctx.stroke();
      ctx.restore();
    });

    // ---------- The dining room ----------
    // Her table, a lace cloth, and on it the ring of spare keys (every door
    // in the house, fifty-two years of them) and her ledger.
    R.thing(5.8, 4.0, (ctx) => {
      for (const [lx, ly] of [[4.5, 2.7], [5.45, 2.7], [4.5, 3.65], [5.45, 3.65]]) box(ctx, lx, ly, 0, 0.12, 0.12, 1.08, C.brown, { flat: true, lw: 0.015 });
      box(ctx, 4.35, 2.55, 1.08, 1.4, 1.35, 0.1, C.brown, { lw: 0.03 });
      // The lace, hanging a little over the edges.
      rect(ctx, 4.25, 2.45, 1.6, 1.55, 1.19, C.white, { lw: 0.02 });
      face(ctx, [[4.25, 4.0, 1.19], [5.85, 4.0, 1.19], [5.85, 4.0, 0.95], [4.25, 4.0, 0.95]], C.white, { lw: 0.02 });
      face(ctx, [[5.85, 2.45, 1.19], [5.85, 4.0, 1.19], [5.85, 4.0, 0.95], [5.85, 2.45, 0.95]], shade(C.white, 0.06), { lw: 0.02 });
      if (Q.detail) {
        ctx.fillStyle = W.floor;
        for (let u = 4.35; u < 5.8; u += 0.18) { const [X, Y] = P(u, 4.0, 0.99); ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fill(); }
        for (let u = 2.55; u < 4.0; u += 0.18) { const [X, Y] = P(5.85, u, 0.99); ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fill(); }
      }
      // The ledger, open.
      rect(ctx, 4.45, 3.35, 0.7, 0.5, 1.2, C.navy, { lw: 0.02 });
      rect(ctx, 4.5, 3.38, 0.6, 0.44, 1.21, C.white, { lw: 0.012 });
      if (Q.detail) for (let i = 0; i < 5; i++) line3(ctx, [[4.55, 3.42 + i * 0.08, 1.215], [5.05, 3.42 + i * 0.08, 1.215]], alpha(C.ink, 0.5), 0.012);
    });
    R.thing(4.1, 3.9, (ctx) => chair(ctx, 3.55, 2.9, 0, C.brown, 'r'));
    R.thing(5.4, 4.9, (ctx) => chair(ctx, 4.65, 4.15, 0, C.brown, 'l'));
    // The ring of spare keys: a big steel ring, a dozen keys, paper tags.
    R.thing(5.9, 4.05, (ctx) => {
      const [X, Y] = P(5.2, 2.95, 1.21);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.3, 0.15, 0, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.075; ctx.stroke();
      ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.04; ctx.stroke();
      const cols = [C.mustard, C.greyLight, C.mustard, C.grey, C.mustard, C.greyLight, C.coral, C.mustard, C.greyLight, C.mustard, C.teal, C.greyLight];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, ex = X + Math.cos(a) * 0.3, ey = Y + Math.sin(a) * 0.15;
        const ox = Math.cos(a) * 0.32, oy = Math.sin(a) * 0.16;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + ox, ey + oy); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.stroke();
        ctx.strokeStyle = cols[i]; ctx.lineWidth = 0.055; ctx.stroke();
        if (i % 3 === 0 && Q.detail) { ctx.beginPath(); ctx.rect(ex + ox - 0.06, ey + oy - 0.03, 0.14, 0.09); paint(ctx, C.white, { lw: 0.012 }); }
      }
    });

    // The goose: the porch goose, brought in out of the rain, standing on
    // its doily by the coat tree, dressed for the day. Her boots beside it.
    R.thing(7.25, 6.45, (ctx) => {
      // The coat tree, a raincoat and a plastic rain bonnet on it.
      box(ctx, 6.75, 5.95, 0, 0.5, 0.5, 0.08, C.brown, { flat: true, lw: 0.02 });
      box(ctx, 6.96, 6.16, 0.08, 0.08, 0.08, 2.9, C.brown, { flat: true, lw: 0.02 });
      const [X, Y] = P(7.0, 6.2, 2.75);
      ctx.beginPath(); ctx.moveTo(X - 0.1, Y); ctx.lineTo(X - 0.45, Y + 1.5); ctx.lineTo(X + 0.4, Y + 1.55); ctx.lineTo(X + 0.12, Y); ctx.closePath();
      paint(ctx, C.navy, { lw: 0.03, dots: shade(C.navy, 0.4), density: 0.2 });
      ctx.beginPath(); ctx.arc(X + 0.05, Y - 0.1, 0.2, Math.PI, 0); paint(ctx, alpha(C.white, 0.6), { lw: 0.02 });
    });
    R.thing(6.6, 7.4, (ctx) => {
      for (const u of [5.9, 6.22]) { box(ctx, u, 6.95, 0, 0.26, 0.4, 0.55, C.red, { flat: true, lw: 0.025 }); }
      // An umbrella stand, full.
      cylinder(ctx, 6.5, 8.3, 0, 0.25, 0.8, C.teal);
      for (const [dx, c] of [[-0.08, C.mustard], [0.06, C.ink], [0.0, C.pink]]) line3(ctx, [[6.5 + dx, 8.3, 0.8], [6.5 + dx * 2, 8.3 - dx, 1.45]], c, 0.07);
    });
    R.rug((ctx) => {
      const [X, Y] = P(7.7, 7.5, 0.01);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.7, 0.32, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
      if (Q.detail) { ctx.beginPath(); ctx.ellipse(X, Y, 0.5, 0.22, 0, 0, Math.PI * 2); ctx.strokeStyle = alpha(C.ink, 0.3); ctx.lineWidth = 0.02; ctx.stroke(); }
    });
    const gooseAt = (t) => ({ x: 7.7, y: 7.5, z: 0.02, dir: 'l', pose: Math.sin(t * 0.45) > 0.93 ? 'honk' : 'stand' });
    R.goose(gooseAt, { bias: 0.3 });
    // Its outfit: a hard hat for moving day, a sou'wester (and slicker) in
    // the rain, a ball cap for the game, a nightcap.
    R.mover(gooseAt, (ctx, t, p) => {
      const h = hh(t), honk = p.pose === 'honk';
      const [X, Y] = P(p.x, p.y, p.z);
      const hx = X - (honk ? 0.5 : 0.28), hy = Y + (honk ? -0.9 : -1.07);
      if (h >= 9.6 && h < 15.4) {
        // The slicker over its back.
        ctx.beginPath(); ctx.ellipse(X + 0.02, Y - 0.49, 0.36, 0.2, 0.12, Math.PI * 1.02, Math.PI * 2.0); ctx.closePath();
        paint(ctx, C.mustard, { lw: 0.025 });
        ctx.beginPath(); ctx.ellipse(hx + 0.04, hy - 0.08, 0.26, 0.07, 0.25, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 });
        ctx.beginPath(); ctx.arc(hx, hy - 0.1, 0.13, Math.PI, 0); paint(ctx, C.mustard, { lw: 0.025 });
      } else if (h >= 15.4 && h < 21) {
        ctx.beginPath(); ctx.arc(hx, hy - 0.06, 0.13, Math.PI, 0); ctx.rect(hx - 0.28, hy - 0.08, 0.2, 0.05); paint(ctx, C.red, { lw: 0.025 });
      } else if (h >= 21 || h < 6) {
        ctx.beginPath(); ctx.moveTo(hx - 0.14, hy - 0.04); ctx.quadraticCurveTo(hx - 0.05, hy - 0.4, hx + 0.3, hy - 0.2); ctx.lineTo(hx + 0.14, hy - 0.04); ctx.closePath();
        paint(ctx, tint(C.sky, 0.3), { lw: 0.025, dots: C.navy, density: 0.3 });
        ctx.beginPath(); ctx.arc(hx + 0.32, hy - 0.2, 0.06, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
      } else {
        ctx.beginPath(); ctx.arc(hx, hy - 0.07, 0.15, Math.PI, 0); ctx.closePath(); paint(ctx, INK_HARDHAT, { lw: 0.025 });
        ctx.beginPath(); ctx.ellipse(hx, hy - 0.07, 0.2, 0.04, 0, 0, Math.PI * 2); paint(ctx, INK_HARDHAT, { lw: 0.02 });
      }
    }, { bias: 0.35 });

    // A spider plant on a stand, and the radiator, clanking.
    R.thing(7.9, 3.3, (ctx) => {
      box(ctx, 7.55, 2.95, 0, 0.5, 0.5, 1.0, C.brown, { flat: true, lw: 0.02 });
      cylinder(ctx, 7.8, 3.2, 1.0, 0.22, 0.3, C.coral);
      ctx.strokeStyle = C.leaf; ctx.lineWidth = 0.04; ctx.lineCap = 'round';
      const [X, Y] = P(7.8, 3.2, 1.3);
      ctx.beginPath();
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.35; ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + Math.cos(a) * 0.4, Y + Math.sin(a) * 0.5, X + Math.cos(a) * 0.55, Y + Math.sin(a) * 0.1 + 0.35 * Math.abs(i - 4) / 4); }
      ctx.stroke();
    });

    // ---------- The front room ----------
    // The couch, in its plastic since 1979; doilies on the arms and back.
    R.thing(11.7, 3.5, (ctx) => {
      sofa(ctx, 9.3, 2.3, 2.4, MAUVE);
      // The plastic: a sheen over the seat and back, and a crease or two.
      face(ctx, [[9.52, 2.6, 0.73], [11.48, 2.6, 0.73], [11.48, 3.52, 0.73], [9.52, 3.52, 0.73]], alpha(C.white, 0.32), { lw: 0.015, stroke: alpha(C.ink, 0.4) });
      face(ctx, [[9.3, 2.63, 0.5], [11.7, 2.63, 0.5], [11.7, 2.63, 1.25], [9.3, 2.63, 1.25]], alpha(C.white, 0.25), { lw: 0.015, stroke: alpha(C.ink, 0.35) });
      if (Q.detail) {
        for (const [u, v] of [[9.8, 3.0], [10.6, 2.8], [11.1, 3.3]]) line3(ctx, [[u, v, 0.735], [u + 0.25, v + 0.2, 0.735]], alpha(C.white, 0.9), 0.04);
        line3(ctx, [[9.7, 2.635, 1.1], [10.1, 2.635, 0.7]], alpha(C.white, 0.9), 0.04);
        line3(ctx, [[10.9, 2.635, 1.15], [11.2, 2.635, 0.8]], alpha(C.white, 0.9), 0.04);
      }
      for (const u of [9.43, 11.57]) disc(ctx, u, 3.05, 0.905, 0.2, C.white, { lw: 0.015 });
      for (const u of [9.9, 11.0]) disc(ctx, u, 2.45, 1.255, 0.22, C.white, { lw: 0.015 });
    });
    // The end table, the lamp (a fringe on the shade, the shade still in
    // its plastic), a candy dish.
    R.thing(12.4, 3.1, (ctx) => {
      box(ctx, 11.85, 2.35, 0, 0.6, 0.65, 1.0, C.wood, { lw: 0.03, top: C.woodLight });
      disc(ctx, 12.15, 2.95, 1.01, 0.14, alpha(tint(C.sky, 0.4), 0.9), { lw: 0.015 });
      for (const [u, v, c] of [[12.1, 2.9, C.red], [12.2, 2.98, C.mustard]]) disc(ctx, u, v, 1.04, 0.04, c, { stroke: false });
      box(ctx, 12.05, 2.5, 1.0, 0.2, 0.2, 0.25, C.white, { flat: true, lw: 0.02 });
      box(ctx, 12.12, 2.57, 1.25, 0.06, 0.06, 0.6, C.mustard, { flat: true, stroke: false });
      const [X, Y] = P(12.15, 2.6, 2.1);
      ctx.beginPath(); ctx.moveTo(X - 0.25, Y - 0.3); ctx.lineTo(X + 0.25, Y - 0.3); ctx.lineTo(X + 0.38, Y + 0.18); ctx.lineTo(X - 0.38, Y + 0.18); ctx.closePath();
      paint(ctx, tint(C.blush, 0.3), { lw: 0.03 });
      if (Q.detail) { ctx.strokeStyle = C.coral; ctx.lineWidth = 0.02; ctx.beginPath(); for (let u = -0.36; u <= 0.36; u += 0.06) { ctx.moveTo(X + u, Y + 0.18); ctx.lineTo(X + u, Y + 0.28); } ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(X - 0.3, Y - 0.36); ctx.lineTo(X + 0.3, Y - 0.36); ctx.lineTo(X + 0.45, Y + 0.24); ctx.lineTo(X - 0.45, Y + 0.24); ctx.closePath();
      paint(ctx, alpha(C.white, 0.25), { lw: 0.015, stroke: alpha(C.ink, 0.45) });
    });
    R.light({ at: [12.15, 2.6, 2.1], r: 4, color: C.butter, k: (t) => (lightsOn(t) ? 0.85 : 0) });
    // The TV: a console in a wood cabinet, rabbit ears, a doily and her
    // wedding photo on top. The game's on at night.
    R.thing(9.7, 7.1, (ctx) => {
      box(ctx, 8.7, 5.5, 0, 0.95, 1.55, 0.2, C.brown, { flat: true, lw: 0.03 });
      box(ctx, 8.7, 5.5, 0.2, 0.95, 1.55, 1.3, C.wood, { lw: 0.04, top: C.woodLight });
      face(ctx, [[9.65, 5.62, 0.35], [9.65, 5.9, 0.35], [9.65, 5.9, 1.35], [9.65, 5.62, 1.35]], shade(C.wood, 0.2), { lw: 0.02 });
      if (Q.detail) for (let z = 0.45; z < 1.3; z += 0.12) line3(ctx, [[9.66, 5.65, z], [9.66, 5.87, z]], C.brown, 0.02);
      disc(ctx, 9.15, 6.3, 1.51, 0.4, C.white, { lw: 0.015 });
      box(ctx, 9.0, 6.75, 1.5, 0.08, 0.45, 0.55, C.mustard, { flat: true, lw: 0.02 });
      face(ctx, [[9.085, 6.8, 1.56], [9.085, 7.15, 1.56], [9.085, 7.15, 1.98], [9.085, 6.8, 1.98]], C.greyLight, { lw: 0.015 });
      for (const a of [-0.5, 0.5]) line3(ctx, [[9.1, 5.85, 1.5], [9.1 + a * 0.4, 5.85 - a * 0.5, 2.25]], C.ink, 0.035);
    });
    const screen = (u, v) => [9.655, 5.95 + u * 1.0, 0.4 + v * 0.95];
    R.thing(9.75, 7.3, (ctx) => {
      face(ctx, [screen(0, 0), screen(1, 0), screen(1, 1), screen(0, 1)], shade(C.grey, 0.35), { lw: 0.03 });
      if (Q.detail) face(ctx, [screen(0.6, 0.6), screen(0.8, 0.9), screen(0.9, 0.9), screen(0.7, 0.6)], alpha(C.white, 0.3), { stroke: false });
    }, { on: (t) => !lightsOn(t) });
    R.thing(9.75, 7.3, (ctx, t) => {
      face(ctx, [screen(0, 0), screen(1, 0), screen(1, 1), screen(0, 1)], C.leaf, { lw: 0.03 });
      if (!Q.detail) return;
      // The ballgame: the infield, a pitch, the score (no names).
      face(ctx, [screen(0.3, 0.15), screen(0.5, 0.5), screen(0.7, 0.15), screen(0.5, 0.02)], C.woodLight, { stroke: false });
      const k = (t * 0.7) % 1, [X, Y] = P(...screen(0.5, 0.35 + k * 0.2));
      ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fill();
      face(ctx, [screen(0.02, 0.78), screen(0.34, 0.78), screen(0.34, 0.97), screen(0.02, 0.97)], C.navy, { stroke: false });
      lettering(ctx, 'y', 9.66, 6.13, 1.24, '4 - 2', 0.1, C.white);
    }, { anim: true, on: lightsOn });
    R.light({ at: [9.9, 6.45, 0.9], r: 2.2, color: tint(C.sky, 0.3), k: (t) => (lightsOn(t) ? 0.6 : 0) });

    // Her armchair at the bay: green velvet, an afghan over the back, a
    // footstool; the radiator cover is the windowsill, where the scanner
    // lives (and a can of Gander Cola).
    R.thing(12.0, 7.0, (ctx) => {
      const x = 10.85, y = 5.8, col = C.green;
      box(ctx, x, y, 0, 1.15, 1.1, 0.5, shade(col, 0.1), { lw: 0.04 });
      box(ctx, x + 0.3, y + 0.2, 0.5, 0.85, 0.7, 0.2, tint(col, 0.15), { lw: 0.03 });
      box(ctx, x, y, 0.5, 0.35, 1.1, 1.3, col, { lw: 0.04 });
      box(ctx, x + 0.3, y, 0.5, 0.85, 0.22, 0.45, col, { lw: 0.035 });
      box(ctx, x + 0.3, y + 0.88, 0.5, 0.85, 0.22, 0.45, col, { lw: 0.035 });
      // The afghan: granny squares down the back.
      face(ctx, [[x + 0.36, y + 0.1, 1.8], [x + 0.36, y + 1.0, 1.8], [x + 0.4, y + 1.0, 0.9], [x + 0.4, y + 0.1, 0.9]], C.mustard, { lw: 0.02, dots: C.coral, density: 0.45 });
    });
    R.thing(11.3, 7.9, (ctx) => box(ctx, 10.7, 7.3, 0, 0.6, 0.6, 0.45, C.green, { lw: 0.03, top: tint(C.green, 0.2) }));
    R.thing(12.5, 8.3, (ctx) => {
      box(ctx, 11.95, 6.9, 0, 0.5, 1.35, 1.0, C.white, { lw: 0.035, top: C.woodLight });
      if (Q.detail) for (let u = 7.0; u < 8.2; u += 0.14) line3(ctx, [[12.45, u, 0.15], [12.45, u, 0.85]], shade(C.white, 0.2), 0.03);
      // Gander Cola, the can she keeps for the man who reads the meters.
      cylinder(ctx, 12.2, 8.0, 1.0, 0.09, 0.28, BRAND.can);
      if (Q.detail) lettering(ctx, 'x', 12.2, 8.09, 1.14, 'GC', 0.06, BRAND.ink);
    });
    // The police scanner: black, an aerial, a row of red lights chasing.
    R.thing(12.6, 8.35, (ctx) => {
      box(ctx, 11.98, 7.12, 1.0, 0.45, 0.5, 0.28, C.black, { lw: 0.03, top: shade(C.greyLight, 0.4) });
      line3(ctx, [[12.1, 7.2, 1.28], [11.9, 7.05, 2.05]], C.ink, 0.035);
      disc(ctx, 11.9, 7.05, 2.07, 0.03, C.ink, { stroke: false });
      face(ctx, [[12.43, 7.18, 1.07], [12.43, 7.56, 1.07], [12.43, 7.56, 1.21], [12.43, 7.18, 1.21]], shade(C.grey, 0.3), { lw: 0.015 });
    });
    R.thing(12.65, 8.4, (ctx, t) => {
      const i = Math.floor(t * 8) % 6;
      for (let k = 0; k < 6; k++) {
        const [X, Y] = P(12.44, 7.2 + k * 0.06, 1.14);
        ctx.fillStyle = k === i ? C.red : shade(C.red, 0.55); ctx.fillRect(X - 0.02, Y - 0.02, 0.04, 0.04);
      }
      // What it says (she listens; the street is on it all day).
      const h = hh(t);
      const lines = h < 9 ? ['...coffee run, City Point...', 'All quiet. Kssht.'] : h < 12 ? ['Truck stuck on Farragut.', 'Couch on a rope. Farragut.', 'Brown van double-parked.'] : h < 13 ? ['Line on a porch. Farragut.'] : h < 15.2 ? ['Truck with no roof. Day Blvd.', 'Man soaked. Castle Island.'] : h < 21 ? ['Truck\'s out! Farragut\'s clear.', 'Plane low over the bay.', 'Mattress in the road.'] : ['Goose on a porch. Farragut.', 'Say again? A goose?', 'Kssht. All quiet.'];
      const p = t % 8;
      if (p < 3.4 && Q.detail) {
        speech(ctx, 12.2, 7.35, 2.2, lines[Math.floor(t / 8) % lines.length], { size: 0.36 });
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02;
        const [X, Y] = P(12.2, 7.1, 1.6);
        for (const r of [0.18, 0.3]) { ctx.beginPath(); ctx.arc(X, Y, r, -1.2, -0.3); ctx.stroke(); }
      }
    }, { anim: true });
    // The cat: on the fridge at dawn, down for breakfast, a nap on the
    // plastic couch through the rain (it squeaks), and the armchair for the
    // game at night.
    const catAt = onHours([
      [5, 0.65, 8.2, 3.0], [9.4, 0.65, 8.2, 3.0], [9.55, 1.5, 7.9, 0], [9.9, 1.9, 5.3, 0], [11.4, 1.9, 5.3, 0],
      [11.9, 8.2, 4.4, 0], [12.2, 10.3, 3.4, 0.74], [17.4, 10.3, 3.4, 0.74], [17.8, 10.9, 4.9, 0], [18.1, 11.5, 6.3, 0.72], [29, 11.5, 6.3, 0.72],
    ]);
    R.mover(catAt, (ctx, t, p) => {
      const h = hh(t);
      cat(ctx, p.x, p.y, p.z, t, { walk: p.moving, dir: p.moving ? p.dir : (h > 17 ? 'l' : 'r'), color: mix(C.mustard, C.coral, 0.35), stripes: true, sleep: !p.moving && h > 12.2 && h < 17.4, eyes: C.green });
      if (!p.moving && h > 12.2 && h < 17.4 && Q.detail && (t % 9) < 1.2) label(ctx, p.x, p.y, p.z + 1.1, 'squeak', 0.2, C.ink, 'Rethink Sans');
    }, { bias: 0.4 });

    // ---------- The porch ----------
    // Her station: a card table, the clipboard, the sign. At noon the key
    // box is open on it.
    R.thing(14.3, 3.95, (ctx) => {
      for (const [lx, ly] of [[13.3, 3.05], [14.15, 3.05], [13.3, 3.8], [14.15, 3.8]]) box(ctx, lx, ly, 0, 0.06, 0.06, 0.95, C.ink, { flat: true, stroke: false });
      box(ctx, 13.25, 3.0, 0.95, 1.0, 0.9, 0.06, C.navy, { flat: true, lw: 0.025, top: C.navy });
      face(ctx, [[13.35, 3.9, 0.94], [14.15, 3.9, 0.94], [14.15, 3.9, 0.55], [13.35, 3.9, 0.55]], C.woodLight, { lw: 0.02 });
      lettering(ctx, 'x', 13.75, 3.91, 0.8, 'KEYS AT NOON', 0.09, C.ink);
      lettering(ctx, 'x', 13.75, 3.91, 0.66, 'ONE AT A TIME', 0.075, C.red);
      rect(ctx, 13.35, 3.1, 0.35, 0.45, 1.02, C.woodLight, { lw: 0.015 });
      rect(ctx, 13.38, 3.15, 0.29, 0.35, 1.025, C.white, { stroke: false });
      cylinder(ctx, 14.0, 3.2, 1.01, 0.08, 0.15, C.white);
    });
    R.thing(14.35, 4.0, (ctx) => {
      box(ctx, 13.75, 3.35, 1.01, 0.45, 0.4, 0.12, C.teal, { flat: true, lw: 0.02, top: shade(C.teal, 0.4) });
      for (let i = 0; i < 6; i++) { const [X, Y] = P(13.82 + (i % 3) * 0.13, 3.42 + Math.floor(i / 3) * 0.15, 1.14); ctx.fillStyle = C.mustard; ctx.fillRect(X - 0.03, Y - 0.05, 0.06, 0.08); ctx.fillStyle = C.white; ctx.fillRect(X - 0.02, Y + 0.02, 0.05, 0.05); }
    }, { on: noon });
    // A geranium, and a sign on the post.
    R.thing(14.6, 0.5, (ctx) => {
      cylinder(ctx, 14.3, 0.35, 0, 0.25, 0.4, C.coral);
      const [X, Y] = P(14.3, 0.35, 0.6);
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(X + Math.cos(i) * 0.18, Y + Math.sin(i * 2) * 0.1 - 0.08, 0.12, 0, Math.PI * 2); paint(ctx, i % 2 ? C.red : C.green, { lw: 0.02 }); }
    });
    // The noon queue, in the rain, in front of the bay.
    for (const q of QUEUE) {
      R.thing(q.x, q.y, (ctx) => {
        person(ctx, q.x, q.y, 0, { ...q.look, pose: 'stand', dir: 'r', back: true, arms: q.umb ? [1.9, 0.2] : [0.2, -0.2] }, 0);
        if (q.umb) umbrella(ctx, q.x, q.y, 0, q.umb);
      }, { on: noon });
    }
    R.thing(15, 9, (ctx, t) => {
      const i = Math.floor(t / 4.5) % QUEUE.length, q = QUEUE[i];
      if ((t % 4.5) < 2.6) speech(ctx, q.x, q.y, 3.4, q.line, { size: 0.36 });
      // Rain dripping off the umbrellas.
      if (!Q.detail) return;
      ctx.fillStyle = tint(C.sky, 0.2);
      particles(t, 10, 0.7, (a, r) => {
        const q2 = QUEUE[Math.floor(r() * 2)], side = r() < 0.5 ? -0.55 : 0.55;
        const [X, Y] = P(q2.x + side * 0.5, q2.y - side * 0.5, 2.9 - a * 2.9);
        ctx.fillRect(X, Y, 0.03, 0.12);
      }, 17);
    }, { anim: true, on: noon, depth: 24 });

    // ---------- The finds ----------
    R.find({ id: 'keys', label: 'The ring of spare keys', at: [5.2, 2.95, 1.3], r: 0.75 });
    R.find({ id: 'deposits', label: 'A coffee can of deposits', at: [0.6, 2.75, 1.4], r: 0.7 });
    R.find({ id: 'scanner', label: 'A police scanner', at: [12.2, 7.37, 1.2], r: 0.7 });
  },
};


