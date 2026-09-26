// The Walk-Up, ground floor: the lobby. A wall of brass mailboxes, a lift that
// has been out of order for decades, the super up a ladder under a light that
// will not behave, a courier buzzing every flat at once, and a dog walker
// slowly being wrapped up like a maypole. The goose lives in the lost and found.
import {
  C, box, rect, disc, cylinder, face, paint, person, folk, plant, walls, slab, checker, rug,
  speech, shade, tint, alpha, Q, label, P, paintText, onLeft, onRight, frame, clockL, note, hash,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp } from '../../../engine/actors.js';

const PI = Math.PI;

// ---------- local helpers ----------

// Text painted on a plane parallel to the right wall (y = yc), or the left wall (x = xc).
function textY(ctx, yc, x, z, text, size, color = C.ink, font) {
  ctx.save();
  ctx.translate(-yc, yc / 2);
  paintText(ctx, 'right', x, z, text, size, color, font);
  ctx.restore();
}
function textX(ctx, xc, y, z, text, size, color = C.ink, font) {
  ctx.save();
  ctx.translate(xc, xc / 2);
  paintText(ctx, 'left', y, z, text, size, color, font);
  ctx.restore();
}

// A line in 3D with an ink outline.
function rod(ctx, a, b, color, w = 0.1) {
  const [ax, ay] = P(...a), [bx, by] = P(...b);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineCap = 'round';
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = w + 0.07;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

// Keyframed path. frames: [[time, x, y], ...] with the last time = period and
// the last point = the first. Returns (t) => { x, y, dir, back, moving, s }.
function keys(frames, period, offset = 0) {
  const segs = [];
  let lastDir = 'r', lastBack = false;
  for (let i = 0; i < frames.length - 1; i++) {
    const [t0, x0, y0] = frames[i], [t1, x1, y1] = frames[i + 1];
    const dx = x1 - x0, dy = y1 - y0;
    const moving = Math.abs(dx) + Math.abs(dy) > 0.001;
    if (moving) { lastDir = dx - dy >= 0 ? 'r' : 'l'; lastBack = dx + dy < -0.01; }
    segs.push({ t0, t1, x0, y0, x1, y1, moving, dir: lastDir, back: lastBack });
  }
  // stills at the start inherit the direction of the last move of the loop
  for (const s of segs) { if (s.moving) break; s.dir = lastDir; s.back = lastBack; }
  return (t) => {
    const s = (((t + offset) % period) + period) % period;
    const g = segs.find((q) => s >= q.t0 && s < q.t1) || segs[segs.length - 1];
    const k = g.t1 > g.t0 ? clamp((s - g.t0) / (g.t1 - g.t0)) : 0;
    return { x: g.x0 + (g.x1 - g.x0) * k, y: g.y0 + (g.y1 - g.y0) * k, dir: g.dir, back: g.back, moving: g.moving, s, k };
  };
}

// ---------- the stairs ----------
const STEPS = 10, STEP_D = 0.8, STEP_H = 0.5, STAIR_FRONT = 8.5, STAIR_W = 2.2;
const stepY = (i) => STAIR_FRONT - (i + 1) * STEP_D; // back edge of step i (0 = bottom)
const stairZ = (y) => clamp(0.625 * (8.9 - y), 0, STEPS * STEP_H); // smooth walking height
const railZ = (y) => 0.625 * (STAIR_FRONT - y) + 1.4;

function step(ctx, i) {
  const y = stepY(i), h = (i + 1) * STEP_H;
  box(ctx, 0, y, 0, STAIR_W, STEP_D, h, C.woodLight, {
    left: C.white, right: shade(C.wood, 0.15), dotsR: shade(C.wood, 0.5), top: C.wood,
  });
  // stair carpet with a brass rod
  face(ctx, [[0.45, y + STEP_D, h - STEP_H], [1.75, y + STEP_D, h - STEP_H], [1.75, y + STEP_D, h], [0.45, y + STEP_D, h]], C.red, { lw: 0.03 });
  rect(ctx, 0.45, y, 1.3, STEP_D, h + 0.003, shade(C.red, 0.08), { lw: 0.03, dots: shade(C.red, 0.4), density: 0.12 });
  if (Q.detail) face(ctx, [[0.4, y + STEP_D - 0.05, h + 0.02], [1.8, y + STEP_D - 0.05, h + 0.02]], null, { lw: 0.07, stroke: C.mustard });
  // stringer panel on the side
  if (Q.detail) face(ctx, [[STAIR_W, y + 0.1, h - 0.4], [STAIR_W, y + STEP_D - 0.1, h - 0.4]], null, { lw: 0.03, stroke: shade(C.wood, 0.4) });
  // baluster and a piece of handrail
  box(ctx, STAIR_W - 0.16, y + 0.35, h, 0.07, 0.07, railZ(y + 0.4) - h, C.white, { flat: true, lw: 0.03 });
  rod(ctx, [STAIR_W - 0.12, y + STEP_D, railZ(y + STEP_D)], [STAIR_W - 0.12, y, railZ(y)], C.brown, 0.13);
}

// ---------- props ----------
function dog(ctx, x, y, t, o) {
  const [X, Y] = P(x, y, 0);
  const f = o.dir === 'l' ? -1 : 1;
  const s = o.scale || 1;
  const ph = t * 12 + (o.phase || 0);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * s, s);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.45, 0.15, 0, 0, PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.16);
    ctx.fill();
  }
  const long = o.long ? 0.2 : 0;
  // legs
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [lx, sg] of [[-0.25 - long, 1], [-0.15 - long, -1], [0.22 + long, -1], [0.32 + long, 1]]) {
    const sw = Math.sin(ph) * 0.08 * sg;
    ctx.moveTo(lx, -0.3); ctx.lineTo(lx + sw, 0);
  }
  ctx.stroke();
  // tail
  ctx.beginPath();
  ctx.moveTo(-0.36 - long, -0.42);
  ctx.lineTo(-0.55 - long, -0.62 + Math.sin(t * 18 + (o.phase || 0)) * 0.1);
  ctx.lineWidth = 0.08;
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.ellipse(0.03, -0.42, 0.42 + long, 0.17, 0, 0, PI * 2);
  paint(ctx, o.color, { lw: 0.04, dots: Q.detail ? shade(o.color, 0.4) : null, density: 0.12 });
  if (o.spot) {
    ctx.beginPath();
    ctx.arc(-0.1, -0.48, 0.1, 0, PI * 2);
    ctx.fillStyle = o.spot;
    ctx.fill();
  }
  // head, snout, ear
  const hx = 0.42 + long, hy = -0.62;
  ctx.beginPath();
  ctx.arc(hx, hy, 0.16, 0, PI * 2);
  ctx.ellipse(hx + 0.17, hy + 0.05, 0.1, 0.07, 0, 0, PI * 2);
  paint(ctx, o.color, { lw: 0.04 });
  ctx.beginPath();
  ctx.ellipse(hx - 0.07, hy - 0.02, 0.06, 0.13, 0.4, 0, PI * 2);
  ctx.fillStyle = o.ear || shade(o.color, 0.35);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(hx + 0.27, hy + 0.03, 0.035, 0, PI * 2);
  ctx.arc(hx + 0.05, hy - 0.04, 0.025, 0, PI * 2);
  ctx.fill();
  // collar
  ctx.beginPath();
  ctx.moveTo(hx - 0.14, hy + 0.1); ctx.lineTo(hx - 0.02, hy + 0.15);
  ctx.strokeStyle = o.leash;
  ctx.lineWidth = 0.06;
  ctx.stroke();
  ctx.restore();
}

// A cardboard parcel standing in a stack.
function parcel(ctx, x, y, z, w, d, h, c, tag) {
  box(ctx, x, y, z, w, d, h, c, { lw: 0.04, dens: 0.14 });
  if (Q.detail) {
    face(ctx, [[x + w / 2, y, z + h + 0.002], [x + w / 2, y + d, z + h + 0.002]], null, { lw: 0.05, stroke: C.butter });
    face(ctx, [[x + w / 2, y + d, z + h], [x + w / 2, y + d, z]], null, { lw: 0.05, stroke: C.butter });
    if (tag) textY(ctx, y + d + 0.001, x + w * 0.28, z + h * 0.5, tag, 0.2, C.ink);
  }
}

function tubaMute(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  ctx.moveTo(X - 0.26, Y);
  ctx.lineTo(X - 0.08, Y - 0.52);
  ctx.lineTo(X + 0.08, Y - 0.52);
  ctx.lineTo(X + 0.26, Y);
  ctx.ellipse(X, Y, 0.26, 0.1, 0, 0, PI);
  paint(ctx, C.wood, { lw: 0.04, dots: shade(C.wood, 0.5), density: 0.18 });
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.52, 0.08, 0.03, 0, 0, PI * 2);
  paint(ctx, C.brown, { lw: 0.03 });
  // cork strips
  ctx.fillStyle = C.butter;
  ctx.fillRect(X - 0.13, Y - 0.36, 0.06, 0.16);
  ctx.fillRect(X + 0.07, Y - 0.36, 0.06, 0.16);
}

function keyring(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.13, 0.07, 0, 0, PI * 2);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.06;
  ctx.stroke();
  ctx.strokeStyle = C.mustard;
  ctx.lineWidth = 0.035;
  ctx.stroke();
  for (const [dx, dy, a, c] of [[0.1, 0.02, 0.3, C.mustard], [0.02, 0.06, 1.3, C.grey], [-0.1, 0.03, 2.5, C.coral]]) {
    ctx.save();
    ctx.translate(X + dx, Y + dy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.rect(0, -0.035, 0.26, 0.07);
    ctx.arc(0.3, 0, 0.07, 0, PI * 2);
    paint(ctx, c, { lw: 0.025 });
    ctx.restore();
  }
}

function balloon(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  const sw = Math.sin(t * 2.2) * 0.12;
  ctx.beginPath();
  ctx.moveTo(X, Y + 0.45);
  ctx.bezierCurveTo(X + 0.15 + sw, Y + 0.8, X - 0.15 - sw, Y + 1.1, X + sw, Y + 1.5);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.035;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.34, 0.42, Math.sin(t * 1.3) * 0.1, 0, PI * 2);
  paint(ctx, C.pink, { lw: 0.05, dots: Q.detail ? shade(C.pink, 0.35) : null, density: 0.12 });
  ctx.beginPath();
  ctx.moveTo(X - 0.07, Y + 0.48); ctx.lineTo(X, Y + 0.4); ctx.lineTo(X + 0.07, Y + 0.48);
  paint(ctx, C.pink, { lw: 0.03 });
  ctx.beginPath();
  ctx.ellipse(X - 0.12, Y - 0.16, 0.06, 0.12, 0.5, 0, PI * 2);
  ctx.fillStyle = alpha(C.white, 0.7);
  ctx.fill();
  if (Q.detail) label(ctx, x, y, z - 0.02, '2B', 0.24, C.white);
}

// The flickering light: on or off at time t.
function lightOn(t) {
  const s = pulse(t, 10) * 10;
  if (s > 3 && s < 3.12) return false;
  if (s > 3.3 && s < 3.42) return false;
  if (s > 3.6 && s < 5.6) return false;
  if (s > 8.3 && s < 8.4) return false;
  if (s > 8.55 && s < 8.62) return false;
  return true;
}

const SKIN_SUPER = '#95603F';
const SKIN_BABY = '#F7DCC4';

export default {
  id: 'lobby',
  name: 'The Lobby',
  blurb: 'The lift has been out of order since 1987, so everybody meets on the stairs. The courier has pressed every buzzer in the building and nobody is coming down.',

  build(R) {
    // ---------- floor and walls ----------
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      checker(ctx, C.paper, tint(C.coral, 0.55), 1);
      // a border of darker tiles
      rect(ctx, 0, 0, 16, 16, 0, null, { stroke: false });
      if (Q.detail) {
        for (let i = 0; i < 16; i++) {
          rect(ctx, i, 15.5, 1, 0.5, 0.001, i % 2 ? C.teal : tint(C.teal, 0.3), { stroke: false });
          rect(ctx, 15.5, i, 0.5, 1, 0.001, i % 2 ? C.teal : tint(C.teal, 0.3), { stroke: false });
        }
      }
    });
    R.wall((ctx) => {
      walls(ctx, { left: tint(C.tealLight, 0.55), right: tint(C.tealLight, 0.4), cap: C.paper, dotsL: C.tealLight, densL: 0.1, dotsR: C.tealLight, densR: 0.1 });
      // wainscot with a rail
      onLeft(ctx, 0, 0, 16, 0.9, C.teal, { dots: shade(C.teal, 0.4), density: 0.2, lw: 0.04 });
      onRight(ctx, 0, 0, 16, 0.9, C.teal, { dots: shade(C.teal, 0.4), density: 0.2, lw: 0.04 });
      onLeft(ctx, 0, 0.9, 16, 0.12, C.paper, { lw: 0.03 });
      onRight(ctx, 0, 0.9, 16, 0.12, C.paper, { lw: 0.03 });
    });

    // ---------- the right wall: mailboxes, the lift, the notice board ----------
    R.decor((ctx) => {
      paintText(ctx, 'right', 8.6, 5.3, 'THE WALK-UP', 0.62, C.navy);
      paintText(ctx, 'right', 8.6, 4.85, 'EST. 1923 . NO LIFT (SEE BELOW)', 0.2, C.teal);

      // Mailbox cabinet
      box(ctx, 2.7, 0, 0.95, 4.4, 0.25, 3.35, C.mustard, { left: C.mustard, flat: true, top: tint(C.mustard, 0.3) });
      textY(ctx, 0.26, 4.9, 4.08, 'LETTERS', 0.2, C.brown);
      for (let f = 1; f <= 4; f++) {
        for (let c = 0; c < 6; c++) {
          const x = 2.85 + c * 0.7, z = 1.1 + (f - 1) * 0.72;
          face(ctx, [[x, 0.26, z], [x + 0.6, 0.26, z], [x + 0.6, 0.26, z + 0.6], [x, 0.26, z + 0.6]], tint(C.mustard, 0.25), { lw: 0.03 });
          if (Q.detail) {
            textY(ctx, 0.27, x + 0.3, z + 0.43, `${f}${'ABCDEF'[c]}`, 0.14, C.brown);
            const [kx, ky] = P(x + 0.3, 0.27, z + 0.2);
            ctx.beginPath();
            ctx.arc(kx, ky, 0.04, 0, PI * 2);
            ctx.fillStyle = C.ink;
            ctx.fill();
          }
        }
      }
      // 3A's box, stuffed: bills and tuba magazines
      if (Q.detail) {
        const x = 2.85, z = 1.1 + 2 * 0.72 + 0.35;
        [[0.08, 0.2, C.white], [0.2, 0.28, C.pink], [0.3, 0.16, C.white], [0.42, 0.24, C.sky]].forEach(([dx, dz, c], i) => {
          face(ctx, [[x + dx, 0.27, z], [x + dx + 0.2, 0.27, z], [x + dx + 0.24 + i * 0.03, 0.5, z + dz], [x + dx + 0.04 + i * 0.03, 0.5, z + dz]], c, { lw: 0.02 });
        });
      }

      // The lift
      onRight(ctx, 7.7, 0, 3.0, 3.8, C.grey, { dots: shade(C.grey, 0.35), density: 0.15 });
      onRight(ctx, 7.9, 0, 1.28, 3.55, tint(C.grey, 0.35), { lw: 0.04 });
      onRight(ctx, 9.22, 0, 1.28, 3.55, tint(C.grey, 0.35), { lw: 0.04 });
      // floor dial
      onRight(ctx, 8.6, 3.95, 1.3, 0.62, C.mustard, { lw: 0.04 });
      if (Q.detail) {
        ['G', '2', '3', 'R'].forEach((n, i) => textY(ctx, 0.001, 8.75 + i * 0.33, 4.4, n, 0.15, C.brown));
      }
      // "out of order" sign, taped on
      onRight(ctx, 8.35, 2.25, 1.9, 1.0, C.white, { lw: 0.04 });
      textY(ctx, 0.002, 9.3, 2.95, 'OUT OF', 0.3, C.red);
      textY(ctx, 0.002, 9.3, 2.62, 'ORDER', 0.3, C.red);
      textY(ctx, 0.002, 9.3, 2.38, 'since 1987', 0.15, C.ink, 'Arial');
      if (Q.detail) {
        face(ctx, [[8.3, 0.003, 3.2], [8.55, 0.003, 3.3]], null, { lw: 0.06, stroke: alpha(C.butter, 0.9) });
        face(ctx, [[10.05, 0.003, 3.3], [10.3, 0.003, 3.2]], null, { lw: 0.06, stroke: alpha(C.butter, 0.9) });
        // cobweb in the corner of the lift frame
        for (let i = 0; i < 4; i++) face(ctx, [[10.7, 0.004, 3.8], [10.7 - 0.5 * Math.cos(i * 0.5), 0.004, 3.8 - 0.5 * Math.sin(i * 0.5)]], null, { lw: 0.02, stroke: C.greyLight });
      }
      // call button plate
      onRight(ctx, 10.95, 1.55, 0.32, 0.7, C.greyLight, { lw: 0.03 });

      // Notice board
      frame(ctx, 'right', 11.7, 1.9, 3.9, 2.5, C.woodLight);
      textY(ctx, 0.002, 13.65, 4.62, 'NOTICES', 0.24, C.navy);
      const notes = [
        [11.85, 3.25, 1.15, 1.0, C.white, ['LOST:', 'TUBA', 'MUTE'], C.red],
        [13.1, 3.35, 1.25, 0.9, C.butter, ['WHO KEEPS', 'STEALING', 'MY PAPER'], C.ink],
        [14.45, 3.05, 1.05, 1.2, C.pink, ['2B PARTY', 'SAT!!', 'SORRY IN', 'ADVANCE'], C.navy],
        [11.95, 2.0, 1.4, 1.05, C.mint, ['3A: YOUR', 'BATH IS IN', 'MY LOBBY'], C.navy],
        [14.6, 2.0, 0.9, 0.85, C.white, ['TUBA', 'HOURS?', 'PLEASE'], C.purple],
      ];
      for (const [x, z, w, h, c, lines, ink] of notes) {
        onRight(ctx, x, z, w, h, c, { lw: 0.03 });
        if (Q.detail) {
          lines.forEach((l, i) => textY(ctx, 0.003, x + w / 2, z + h - 0.2 - i * 0.2, l, 0.15, ink, 'Arial Black'));
          const [px, py] = P(x + w / 2, 0.004, z + h - 0.06);
          ctx.beginPath();
          ctx.arc(px, py, 0.05, 0, PI * 2);
          ctx.fillStyle = C.red;
          ctx.fill();
        }
      }
    });

    // Lift dial needle (hopeful twitching) and the call button being mashed
    R.decor((ctx, t) => {
      const a = PI * 0.85 - Math.abs(Math.sin(t * 7)) * 0.08 * (pulse(t, 5) > 0.6 ? 1 : 0.2);
      face(ctx, [[9.25, 0.005, 4.0], [9.25 + Math.cos(a) * 0.45, 0.005, 4.0 + Math.sin(a) * 0.45]], null, { lw: 0.05, stroke: C.ink });
      const lit = pulse(t, 0.6) < 0.5;
      for (const [z, on] of [[2.05, lit], [1.75, false]]) {
        const [X, Y] = P(11.11, 0.005, z);
        ctx.beginPath();
        ctx.arc(X, Y, 0.08, 0, PI * 2);
        paint(ctx, on ? C.mustard : C.white, { lw: 0.03 });
      }
    }, { anim: true });

    // The mailbox door that swings open, once per junk-mail cycle
    const MAIL = 9;
    const doorAngle = (t) => {
      const s = pulse(t, MAIL) * MAIL;
      if (s < 0.8) return (s / 0.8) * 1.7;
      if (s < 6.5) return 1.7;
      if (s < 7.3) return 1.7 * (1 - (s - 6.5) / 0.8);
      return 0;
    };
    R.decor((ctx, t) => {
      const a = doorAngle(t);
      const x = 2.85 + 4 * 0.7, z = 1.1 + 0.72; // 2E
      if (a <= 0) return;
      face(ctx, [[x, 0.27, z], [x + 0.6, 0.27, z], [x + 0.6, 0.27, z + 0.6], [x, 0.27, z + 0.6]], C.ink);
      const ex = x + Math.cos(a) * 0.6, ey = 0.27 + Math.sin(a) * 0.6;
      face(ctx, [[x, 0.27, z], [ex, ey, z], [ex, ey, z + 0.6], [x, 0.27, z + 0.6]], tint(C.mustard, 0.1), { lw: 0.03 });
    }, { anim: true });

    // ---------- the left wall: stairs, radiator, front door, intercom ----------
    R.decor((ctx) => {
      paintText(ctx, 'left', 5.6, 5.45, 'UP: 2B . 3A . ROOF', 0.3, C.navy);
      paintText(ctx, 'left', 5.6, 5.05, '(mind the tuba)', 0.2, C.teal, 'Arial');
      clockL(ctx, 9.75, 3.3, 0.45);
      // front door: frame, two leaves with glass, fanlight
      onLeft(ctx, 10.8, 0, 2.9, 4.4, C.brown, { lw: 0.05 });
      onLeft(ctx, 11.0, 0, 1.22, 3.5, C.red, { dots: shade(C.red, 0.4), density: 0.15, lw: 0.04 });
      onLeft(ctx, 12.28, 0, 1.22, 3.5, C.red, { dots: shade(C.red, 0.4), density: 0.15, lw: 0.04 });
      onLeft(ctx, 11.2, 1.7, 0.82, 1.5, C.sky, { dots: tint(C.sky, 0.5), density: 0.2, lw: 0.04 });
      onLeft(ctx, 12.48, 1.7, 0.82, 1.5, C.sky, { dots: tint(C.sky, 0.5), density: 0.2, lw: 0.04 });
      onLeft(ctx, 11.0, 3.62, 2.5, 0.65, C.butter, { lw: 0.04 });
      paintText(ctx, 'left', 12.25, 3.94, 'No. 16', 0.34, C.brown);
      for (const y of [12.1, 12.4]) {
        const [X, Y] = P(0.02, y, 1.5);
        ctx.beginPath();
        ctx.arc(X, Y, 0.07, 0, PI * 2);
        paint(ctx, C.mustard, { lw: 0.03 });
      }
      // intercom panel
      onLeft(ctx, 13.95, 1.3, 0.75, 1.3, C.greyLight, { lw: 0.04 });
      paintText(ctx, 'left', 14.32, 2.43, 'BUZZ', 0.14, C.ink, 'Arial Black');
      onLeft(ctx, 14.05, 1.45, 0.55, 0.3, C.ink, { lw: 0.02 });
      // a framed old photo of the building
      frame(ctx, 'left', 14.3, 3.4, 1.3, 1.2, C.sky, (g) => {
        face(g, [[0, 14.6, 3.5], [0, 15.3, 3.5], [0, 15.3, 4.3], [0, 14.6, 4.3]], C.paperDeep, { lw: 0.03 });
        for (let i = 0; i < 3; i++) face(g, [[0, 14.65, 3.75 + i * 0.2], [0, 15.25, 3.75 + i * 0.2]], null, { lw: 0.02 });
      });
    });

    // Intercom buttons, lighting up one after another as he presses all of them
    R.decor((ctx, t) => {
      const k = Math.floor(t * 2.2) % 8;
      for (let i = 0; i < 8; i++) {
        const y = 14.12 + (i % 2) * 0.3, z = 1.9 + Math.floor(i / 2) * 0.12;
        const [X, Y] = P(0.01, y + 0.12, z);
        ctx.beginPath();
        ctx.arc(X, Y, 0.045, 0, PI * 2);
        ctx.fillStyle = i === k ? C.mustard : C.white;
        ctx.fill();
      }
    }, { anim: true });

    // Stairs: one thing per step so people on them sort properly
    for (let i = 0; i < STEPS; i++) {
      R.thing(1.1, stepY(i) - 0.01, (ctx) => step(ctx, i), { depth: 1.1 + stepY(i) - 0.01 });
    }
    // newel post at the bottom
    R.thing(2.2, 8.6, (ctx) => {
      box(ctx, STAIR_W - 0.3, 8.3, 0, 0.3, 0.3, 1.9, C.brown);
      disc(ctx, STAIR_W - 0.15, 8.45, 2.05, 0.18, C.mustard);
      const [X, Y] = P(STAIR_W - 0.15, 8.45, 2.05);
      ctx.beginPath();
      ctx.arc(X, Y - 0.08, 0.17, 0, PI * 2);
      paint(ctx, C.mustard, { lw: 0.04 });
    });

    // Tuba practice drifting down the stairwell from 3A
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 5, 6, (k, r) => {
        const y = 0.8 + k * 7.5;
        const z = stairZ(y) + 2.8 + Math.sin(k * 9 + r() * 6) * 0.3;
        ctx.save();
        ctx.globalAlpha = Math.sin(k * PI);
        note(ctx, 1.0 + (r() - 0.5) * 1.2, y, z, C.purple, 1.2 + r() * 0.4);
        ctx.restore();
      }, 7);
      const s = pulse(t, 7);
      if (s < 0.45) {
        ctx.save();
        ctx.globalAlpha = Math.sin((s / 0.45) * PI);
        label(ctx, 1.2, 0.8 + s * 3, 7.2 - s * 2, 'BWOMP', 0.42, C.purple);
        ctx.restore();
      }
    });

    // Neighbor with shopping, up the stairs and back down (forgot the keys)
    const climb = keys([[0, 1.2, 9.8], [2, 1.2, 9.8], [12, 1.1, 1.0], [15, 1.1, 1.0], [25, 1.2, 9.8], [26, 1.2, 9.8]], 26, 3);
    R.mover((t) => { const p = climb(t); return { ...p, z: stairZ(p.y) }; }, (ctx, t, p) => {
      person(ctx, p.x, p.y, p.z, folk(51, {
        pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, style: 'bun', hair: '#B9B5AE', top: C.purple, bottom: C.navy, speed: 5,
        hold: (g) => {
          g.beginPath();
          g.roundRect(-0.05, 0.1, 0.42, 0.5, 0.06);
          paint(g, C.paperDeep, { lw: 0.04 });
          g.fillStyle = C.leaf;
          g.beginPath();
          g.arc(0.1, 0.08, 0.1, 0, PI * 2);
          g.arc(0.24, 0.04, 0.08, 0, PI * 2);
          g.fill();
        },
      }), t);
      if (Q.detail && p.s > 12 && p.s < 15) speech(ctx, p.x, p.y, p.z + 2.6, 'MY KEYS!', { size: 0.4 });
    }, { bias: 0.05 });

    // The runaway party balloon from 2B, drifting down the stairwell (a find)
    const BAL = 24;
    const bal = (t) => {
      const s = pulse(t, BAL) * BAL;
      const bob = Math.sin(t * 1.7) * 0.15;
      if (s < 13) {
        const y = 0.8 + (s / 13) * 7.9;
        return { x: 1.3, y, z: stairZ(y) + 2.5 + bob };
      }
      if (s < 17) {
        const q = clamp((s - 13) / 1.5);
        return { x: 1.3 + q * 1.2, y: 8.7 + q * 0.6, z: 2.7 - q * 0.2 + bob };
      }
      const q = (s - 17) / 7;
      const y = 9.3 - q * 8.5;
      return { x: 2.5 - q * 1.2, y, z: Math.max(stairZ(y) + 2.5, 2.5 + q * 2) + bob };
    };
    R.mover(bal, (ctx, t, p) => balloon(ctx, p.x, p.y, p.z, t), { bias: 0.2 });

    // A snail, taking the stairs like everybody else (a find)
    const SN = 80;
    const snail = (t) => {
      const s = pulse(t, SN) * SN;
      if (s < 4) return { x: 0.35, y: 8.85 - (s / 4) * 0.33, z: 0, a: clamp(s), up: false };
      const q = s - 4, per = 6.5;
      const i = Math.min(STEPS - 1, Math.floor(q / per));
      const k = i === STEPS - 1 && q >= STEPS * per ? 1 : (q - i * per) / per;
      const y0 = stepY(i), h = (i + 1) * STEP_H;
      const a = 1 - clamp((s - (SN - 1.5)) / 1.5);
      if (k < 0.3) return { x: 0.35, y: y0 + STEP_D + 0.02, z: h - STEP_H + (k / 0.3) * STEP_H, a, up: true };
      return { x: 0.35, y: y0 + STEP_D - ((k - 0.3) / 0.7) * (STEP_D - 0.15), z: h, a, up: false };
    };
    R.mover(snail, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, p.z);
      ctx.save();
      ctx.globalAlpha = p.a;
      ctx.translate(X, Y);
      if (p.up) ctx.rotate(-1.1);
      const st = Math.sin(t * 3) * 0.02;
      ctx.beginPath();
      ctx.moveTo(-0.3, 0);
      ctx.quadraticCurveTo(0.1, 0.03, 0.3 + st, -0.02);
      ctx.lineTo(0.34 + st, -0.14);
      ctx.quadraticCurveTo(0.2, -0.1, 0.12, -0.05);
      ctx.closePath();
      paint(ctx, C.blush, { lw: 0.03 });
      ctx.beginPath();
      ctx.moveTo(0.3 + st, -0.12); ctx.lineTo(0.36 + st, -0.3);
      ctx.moveTo(0.33 + st, -0.12); ctx.lineTo(0.44 + st, -0.26);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.03;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-0.04, -0.18, 0.18, 0, PI * 2);
      paint(ctx, C.coral, { lw: 0.035 });
      ctx.beginPath();
      ctx.arc(-0.04, -0.18, 0.1, 0.5, PI * 1.9);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.025;
      ctx.stroke();
      ctx.restore();
    }, { depth: (t) => { const p = snail(t); return 1.1 + p.y + 0.02; } });
    R.find({ id: 'snail', label: 'A snail taking the stairs', r: 0.7, at: (t) => { const p = snail(t); return [p.x, p.y, p.z + 0.15]; } });

    // A kid at the foot of the stairs, jumping for the balloon
    R.mover(() => ({ x: 3.2, y: 9.8 }), (ctx, t) => {
      const s = pulse(t, BAL) * BAL;
      const pose = s > 13 && s < 17 ? 'jump' : s >= 17 && s < 20 ? 'stand' : 'point';
      person(ctx, 3.2, 9.8, 0, folk(61, { pose, dir: 'l', scale: 0.7, hat: 'party', top: C.mustard, bottom: C.teal, speed: 8, arms: pose === 'point' ? [2.4, -0.2] : undefined }), t);
      if (Q.detail && s > 17.3 && s < 19.5) speech(ctx, 3.2, 9.8, 2.1, 'NOOO', { size: 0.38 });
    });

    // Radiator, hissing, with the lost tuba mute sitting on top (a find)
    R.thing(0.5, 10.6, (ctx) => {
      box(ctx, 0, 8.9, 0.1, 0.45, 1.7, 1.2, C.white, { right: C.white, left: tint(C.grey, 0.4) });
      if (Q.detail) for (let i = 1; i < 9; i++) face(ctx, [[0.45, 8.9 + i * 0.19, 0.2], [0.45, 8.9 + i * 0.19, 1.2]], null, { lw: 0.03, stroke: C.grey });
      box(ctx, 0.35, 10.4, 0, 0.1, 0.1, 0.25, C.grey, { flat: true });
      tubaMute(ctx, 0.25, 9.5, 1.3);
    });
    R.find({ id: 'mute', label: 'A tuba mute', at: [0.25, 9.5, 1.55], r: 0.7 });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 5, 2.5, (k, r) => {
        const [X, Y] = P(0.25, 10.1 + r() * 0.4, 1.4 + k * 1.4);
        ctx.beginPath();
        ctx.arc(X + Math.sin(k * 6 + r() * 5) * 0.15, Y, 0.1 + k * 0.2, 0, PI * 2);
        ctx.fillStyle = alpha(C.white, 0.7 * (1 - k));
        ctx.fill();
      }, 3);
    });

    // Doormat with somebody's keys on it (a find)
    R.rug((ctx) => {
      // runner from the door into the hall
      rug(ctx, 2.0, 11.35, 9.5, 2.0, C.navy, C.mustard);
      rect(ctx, 0.08, 11.3, 1.8, 2.1, 0.012, C.brown, { dots: shade(C.brown, 0.5), density: 0.3, lw: 0.04 });
      rect(ctx, 0.25, 11.5, 1.45, 1.7, 0.014, null, { lw: 0.05, stroke: C.butter });
      keyring(ctx, 0.95, 12.45, 0.02);
    });
    R.find({ id: 'keys', label: 'A set of keys', at: [1.05, 12.45, 0.05], r: 0.7 });

    // ---------- the courier ----------
    // Hand truck with a swaying tower of parcels (one is a second tuba for 3A)
    R.thing(3.4, 13.0, (ctx, t) => {
      const sw = (i) => Math.sin(t * 1.6) * 0.035 * i * i;
      box(ctx, 2.3, 12.2, 0, 1.1, 0.8, 0.1, C.grey, { flat: true });
      rod(ctx, [2.35, 12.25, 0], [2.35, 12.25, 3.2], C.grey, 0.08);
      rod(ctx, [2.35, 12.95, 0], [2.35, 12.95, 3.2], C.grey, 0.08);
      disc(ctx, 2.4, 13.05, 0.2, 0.2, C.ink);
      const stack = [
        [0.85, 0.7, 0.7, C.wood, '3A'],
        [0.8, 0.65, 0.5, C.woodLight, '2B'],
        [0.75, 0.6, 1.3, C.wood, 'TUBA 2'],
        [0.6, 0.55, 0.45, C.woodLight, '3A'],
        [0.5, 0.45, 0.4, C.wood, '3A?'],
      ];
      let z = 0.1;
      stack.forEach(([w, d, h, c, tag], i) => {
        const o = sw(i);
        parcel(ctx, 2.45 + (0.9 - w) / 2 + o, 12.25 + (0.75 - d) / 2 - o, z, w, d, h, c, tag);
        z += h;
      });
    }, { anim: true });
    R.mover(() => ({ x: 1.5, y: 14.4 }), (ctx, t) => {
      const s = pulse(t, 12) * 12;
      person(ctx, 1.5, 14.4, 0, { skin: SKIN_SUPER, hair: C.ink, style: 'short', top: C.coral, bottom: C.brown, hat: 'cap', pose: pulse(t, 0.45) < 0.5 ? 'point' : 'stand', dir: 'l', back: true }, t);
      if (Q.detail && s > 1 && s < 4.5) speech(ctx, 1.5, 14.4, 2.8, 'PARCEL FOR 3A!', { size: 0.4 });
      if (Q.detail && s > 7 && s < 9.5) speech(ctx, 1.2, 14.1, 2.8, 'ANYONE?', { size: 0.4 });
    });

    // ---------- the mail wall ----------
    // Collector at 2D, getting an avalanche of pizza menus
    R.mover(() => ({ x: 4.9, y: 1.3 }), (ctx, t) => {
      const s = pulse(t, MAIL) * MAIL;
      person(ctx, 4.9, 1.3, 0, folk(71, { pose: s > 1 && s < 3.2 ? 'cheer' : 'point', dir: 'r', back: true, style: 'curly', top: C.green, dress: false }), t);
      if (Q.detail && s > 3.3 && s < 6.2) speech(ctx, 4.9, 1.3, 2.8, 'ALL MENUS!', { size: 0.4 });
    });
    R.mover(() => ({ x: 5.2, y: 0.9 }), (ctx, t) => {
      const s = pulse(t, MAIL) * MAIL;
      if (s < 0.9 || s > 8.4) return;
      const cyc = Math.floor(t / MAIL);
      const fade = s > 7.6 ? 1 - (s - 7.6) / 0.8 : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      for (let i = 0; i < 14; i++) {
        const st = 0.9 + i * 0.13, k = clamp((s - st) / 0.75);
        if (s < st) continue;
        const lx = 4.4 + hash(i, cyc) * 2.4, ly = 0.6 + hash(i + 40, cyc) * 1.8;
        const x = 5.95 + (lx - 5.95) * k, y = 0.4 + (ly - 0.4) * k, z = 2.1 * (1 - k * k) + 0.02;
        if (k < 1) {
          const [X, Y] = P(x, y, z + Math.sin(k * 8) * 0.1);
          ctx.save();
          ctx.translate(X, Y);
          ctx.rotate(Math.sin(k * 10 + i) * 0.8);
          ctx.beginPath();
          ctx.rect(-0.16, -0.1, 0.32, 0.2);
          paint(ctx, i % 3 ? C.white : C.coralLight, { lw: 0.025 });
          ctx.restore();
        } else {
          rect(ctx, x, y, 0.3, 0.22, 0.01, i % 3 ? C.white : C.coralLight, { lw: 0.025 });
        }
      }
      ctx.restore();
    }, { depth: 6.0 });

    // The queue for the mailboxes
    R.mover(() => ({ x: 5.4, y: 2.7 }), (ctx, t) => {
      person(ctx, 5.4, 2.7, 0, folk(72, { pose: 'read', dir: 'r', style: 'long', hat: undefined, top: C.sky, hold: (g) => {
        g.beginPath();
        g.rect(0.05, -0.25, 0.4, 0.5);
        paint(g, C.white, { lw: 0.03 });
      } }), t);
    });
    R.mover(() => ({ x: 5.8, y: 4.1 }), (ctx, t) => {
      const s = pulse(t, 11) * 11;
      person(ctx, 5.8, 4.1, 0, { skin: '#F7DCC4', hair: '#B9B5AE', style: 'bald', top: C.brown, bottom: C.grey, pose: 'stand', dir: 'r', back: s < 7, arms: [0.5, -0.1] }, t);
      // cane
      const [X, Y] = P(5.8, 4.1, 0);
      ctx.beginPath();
      ctx.moveTo(X + 0.45, Y);
      ctx.lineTo(X + 0.55, Y - 1.1);
      ctx.arc(X + 0.45, Y - 1.1, 0.1, 0, PI, true);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.08;
      ctx.stroke();
      if (Q.detail && s > 7.5 && s < 10.5) speech(ctx, 5.8, 4.1, 2.7, 'NO RUSH...', { size: 0.4 });
    });

    // ---------- the lift and the notice board ----------
    R.thing(9.25, 1.1, (ctx, t) => plant(ctx, 9.25, 0.9, 0, t, { kind: 'leafy', scale: 1.3, potColor: C.coral }), { anim: true });
    R.mover(() => ({ x: 11.1, y: 1.3 }), (ctx, t) => {
      const s = pulse(t, 13) * 13;
      person(ctx, 11.1, 1.3, 0, folk(81, { pose: pulse(t, 0.6) < 0.5 ? 'point' : 'stand', dir: 'r', back: true, top: C.navy, bottom: C.ink, style: 'short', hair: C.brown }), t);
      if (Q.detail && s > 2 && s < 5.5) speech(ctx, 11.1, 1.3, 2.8, 'ANY SECOND NOW', { size: 0.4 });
    });
    // Neighbor pinning up a fresh complaint
    R.mover(() => ({ x: 13.0, y: 1.3 }), (ctx, t) => {
      const s = pulse(t, 8) * 8;
      person(ctx, 13.0, 1.3, 0, folk(82, { pose: 'point', dir: 'r', back: true, style: 'pony', top: C.teal, arms: [2.3 + Math.sin(t * 6) * (s < 3 ? 0.15 : 0), -0.1] }), t);
    });

    // ---------- the lost and found, where the goose lives ----------
    const LX = 14.6, LY = 0.3, LW = 1.3, LD = 1.4, LH = 1.0;
    R.thing(LX, LY, (ctx) => {
      face(ctx, [[LX, LY, 0], [LX + LW, LY, 0], [LX + LW, LY, LH], [LX, LY, LH]], shade(C.woodLight, 0.3), { lw: 0.04 });
      face(ctx, [[LX, LY, 0], [LX, LY + LD, 0], [LX, LY + LD, LH], [LX, LY, LH]], shade(C.woodLight, 0.2), { lw: 0.04 });
      // things nobody claimed: an umbrella, a boot, a teddy
      rod(ctx, [LX + 0.3, LY + 0.3, 0.3], [LX + 0.1, LY + 0.2, 2.0], C.purple, 0.1);
      const [ux, uy] = P(LX + 0.1, LY + 0.2, 2.0);
      ctx.beginPath();
      ctx.arc(ux + 0.12, uy, 0.12, PI, 0);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.07;
      ctx.stroke();
      box(ctx, LX + 0.9, LY + 0.2, 0.5, 0.3, 0.4, 0.8, C.red, { lw: 0.03 });
      const [tx, ty] = P(LX + 0.6, LY + 0.2, 1.2);
      ctx.beginPath();
      ctx.arc(tx, ty, 0.2, 0, PI * 2);
      ctx.arc(tx - 0.16, ty - 0.16, 0.08, 0, PI * 2);
      ctx.arc(tx + 0.16, ty - 0.16, 0.08, 0, PI * 2);
      paint(ctx, C.wood, { lw: 0.03 });
    }, { depth: LX + LY + 0.2 });
    R.thing(LX + LW, LY + LD, (ctx) => {
      box(ctx, LX, LY + LD - 0.02, 0, LW, 0.02, LH, C.woodLight, { left: C.woodLight, lw: 0.04 });
      face(ctx, [[LX + LW, LY, 0], [LX + LW, LY + LD, 0], [LX + LW, LY + LD, LH], [LX + LW, LY, LH]], shade(C.woodLight, 0.12), { lw: 0.04 });
      // flaps
      face(ctx, [[LX, LY + LD, LH], [LX + LW, LY + LD, LH], [LX + LW, LY + LD + 0.4, LH - 0.35], [LX, LY + LD + 0.4, LH - 0.35]], tint(C.woodLight, 0.15), { lw: 0.04 });
      face(ctx, [[LX + LW, LY, LH], [LX + LW, LY + LD, LH], [LX + LW + 0.4, LY + LD, LH - 0.3], [LX + LW + 0.4, LY, LH - 0.3]], tint(C.woodLight, 0.1), { lw: 0.04 });
      textY(ctx, LY + LD + 0.001, LX + LW / 2, 0.62, 'LOST &', 0.19, C.navy);
      textY(ctx, LY + LD + 0.001, LX + LW / 2, 0.36, 'FOUND', 0.19, C.navy);
    }, { depth: LX + LW + LY + LD });

    // The goose: lives in the lost and found, commutes to the mailbox queue
    const GP = 36;
    const gWalk = keys([
      [0, 15.2, 1.0], [11, 15.2, 1.0], [12, 15.0, 2.5], [15, 12.4, 3.0], [19.5, 8.0, 3.8], [21.5, 5.0, 5.4],
      [28, 5.0, 5.4], [30, 8.0, 3.8], [33, 12.4, 3.0], [35, 15.0, 2.5], [36, 15.2, 1.0],
    ], GP);
    R.goose((t) => {
      const p = gWalk(t);
      const s = p.s;
      if (s < 11) return { x: 15.2, y: 1.0, z: 0.45, dir: 'l', pose: s > 5 && s < 6.2 ? 'honk' : 'sit' };
      if (s < 12 || s >= 35) {
        const q = s < 12 ? s - 11 : 1 - (s - 35);
        return { x: p.x, y: p.y, z: 0.45 * (1 - q) + Math.sin(q * PI) * 0.9, dir: s < 12 ? 'l' : 'r', pose: 'stand' };
      }
      if (s >= 21.5 && s < 28) return { x: p.x, y: p.y, z: 0, dir: 'r', pose: s > 24 && s < 25.3 ? 'honk' : s > 26 ? 'peck' : 'stand' };
      return { x: p.x, y: p.y, z: 0, dir: p.dir, pose: 'walk', moving: true };
    });

    // ---------- the super, the ladder and the light ----------
    const LXd = 12.5, LYd = 8.8;
    R.thing(LXd + 0.3, LYd + 0.75, (ctx) => {
      for (const x of [LXd - 0.3, LXd + 0.3]) {
        rod(ctx, [x, LYd - 0.7, 0], [x, LYd - 0.05, 2.6], C.coral, 0.1);
        rod(ctx, [x, LYd + 0.7, 0], [x, LYd + 0.05, 2.6], C.coral, 0.1);
      }
      for (const z of [0.65, 1.3, 1.95]) rod(ctx, [LXd - 0.3, LYd + 0.7 - (z / 2.6) * 0.65, z], [LXd + 0.3, LYd + 0.7 - (z / 2.6) * 0.65, z], C.coral, 0.07);
      box(ctx, LXd - 0.4, LYd - 0.25, 2.6, 0.8, 0.5, 0.12, C.coral);
    });
    // toolbox and a box of spare bulbs
    R.thing(14.5, 8.4, (ctx) => {
      box(ctx, 13.6, 7.9, 0, 0.9, 0.5, 0.45, C.red);
      face(ctx, [[13.85, 8.15, 0.45], [13.85, 8.15, 0.65], [14.25, 8.15, 0.65], [14.25, 8.15, 0.45]], null, { lw: 0.05 });
      box(ctx, 13.7, 8.6, 0, 0.5, 0.5, 0.35, C.white);
      if (Q.detail) for (const [bx, by] of [[13.85, 8.75], [14.05, 8.9]]) disc(ctx, bx, by, 0.4, 0.09, C.butter, { lw: 0.02 });
    });
    // The super, the fixture and the sparks
    R.mover(() => ({ x: LXd, y: LYd }), (ctx, t) => {
      const on = lightOn(t);
      const s = pulse(t, 10) * 10;
      const [LX0, LY0] = P(LXd, LYd, 5.35);
      if (on && Q.detail) {
        const g = ctx.createRadialGradient(LX0, LY0 + 0.4, 0.1, LX0, LY0 + 0.4, 3.2);
        g.addColorStop(0, alpha(C.butter, 0.6));
        g.addColorStop(1, alpha(C.butter, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(LX0, LY0 + 0.4, 3.2, 0, PI * 2);
        ctx.fill();
      }
      const wob = Math.sin(t * 2.3) * 0.05;
      person(ctx, LXd + wob, LYd - wob, 2.72, {
        skin: SKIN_SUPER, hair: C.ink, style: 'short', top: C.navy, bottom: C.navy, hat: 'cap', dir: 'r', pose: 'stand',
        arms: [2.75 + Math.sin(t * 5) * 0.12, -2.9 + Math.sin(t * 4) * 0.1],
      }, t);
      // cord, fixture and bulb
      rod(ctx, [LXd, LYd, 8], [LXd, LYd, 5.6], C.ink, 0.03);
      const [FX, FY] = P(LXd, LYd, 5.6);
      ctx.beginPath();
      ctx.moveTo(FX - 0.55, FY + 0.35);
      ctx.quadraticCurveTo(FX, FY - 0.35, FX + 0.55, FY + 0.35);
      ctx.closePath();
      paint(ctx, C.teal, { lw: 0.05 });
      ctx.beginPath();
      ctx.arc(FX, FY + 0.42, 0.18, 0, PI * 2);
      paint(ctx, on ? C.butter : C.grey, { lw: 0.04 });
      if (Q.detail && !on) {
        particles(t, 8, 0.5, (k, r) => {
          const a = r() * PI * 2;
          const d = k * (0.5 + r() * 0.5);
          ctx.fillStyle = r() > 0.5 ? C.mustard : C.coral;
          ctx.fillRect(FX + Math.cos(a) * d, FY + 0.4 + Math.sin(a) * d * 0.6 + k * k * 0.6, 0.07, 0.07);
        }, 11);
      }
      if (Q.detail && s > 5.7 && s < 8.2) speech(ctx, LXd, LYd, 6.3, 'FIXED IT.', { size: 0.42, dx: 1.0 });
    }, { bias: 1.3 });
    // The super's kid, holding the ladder, not really
    R.mover(() => ({ x: 13.1, y: 10.0 }), (ctx, t) => {
      const s = pulse(t, 10) * 10;
      person(ctx, 13.1, 10.0, 0, folk(91, { pose: s > 3.6 && s < 5.6 ? 'point' : 'carry', dir: 'l', scale: 0.8, top: C.mustard, bottom: C.navy, hat: 'beanie', arms: s > 3.6 && s < 5.6 ? [2.6, 0.3] : undefined }), t);
      if (Q.detail && s > 3.8 && s < 5.6) speech(ctx, 13.1, 10.0, 2.2, 'STILL OFF!', { size: 0.4, dx: -0.9 });
    });
    // The whole lobby dims when the light gives up
    R.air((ctx, t) => {
      if (lightOn(t)) return;
      ctx.beginPath();
      const pts = [[16, 0, 0], [16, 16, 0], [0, 16, 0], [0, 16, 6], [0, 0, 6], [16, 0, 6]];
      pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath();
      ctx.fillStyle = alpha(C.night, 0.13);
      ctx.fill();
    });

    // ---------- the leak from 3A ----------
    R.rug((ctx) => {
      disc(ctx, 12.6, 5.3, 0.005, 0.9, alpha(C.water, 0.35), { stroke: false });
      disc(ctx, 13.1, 5.9, 0.005, 0.5, alpha(C.water, 0.3), { stroke: false });
    });
    R.thing(13.0, 5.6, (ctx, t) => {
      cylinder(ctx, 12.6, 5.2, 0, 0.42, 0.75, C.grey, { top: C.water });
      label(ctx, 12.7, 5.3, 0.4, '3A', 0.28, C.white);
      if (!Q.detail) return;
      const k = pulse(t, 1.4);
      const [X, Y] = P(12.6, 5.2, 0.75);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.1 + k * 0.45, (0.1 + k * 0.45) / 2, 0, 0, PI * 2);
      ctx.strokeStyle = alpha(C.white, 1 - k);
      ctx.lineWidth = 0.04;
      ctx.stroke();
    }, { anim: true });
    R.air((ctx, t) => {
      const k = pulse(t, 1.4);
      const z = 7.8 - 7.05 * k * k;
      const [X, Y] = P(12.6, 5.2, z);
      ctx.beginPath();
      ctx.arc(X, Y, 0.09, 0, PI * 2);
      ctx.moveTo(X - 0.09, Y);
      ctx.lineTo(X, Y - 0.22);
      ctx.lineTo(X + 0.09, Y);
      paint(ctx, C.sky, { lw: 0.03 });
    });
    // Somebody mopping the puddle, which is a losing battle
    const MX0 = 14.0, MY0 = 4.9;
    R.mover(() => ({ x: MX0, y: MY0 }), (ctx, t) => {
      const sw = Math.sin(t * 3);
      const mx = 13.25 + sw * 0.35, my = 5.55 - sw * 0.3;
      const [X, Y] = P(MX0, MY0, 0);
      const [MX, MY] = P(mx, my, 0);
      ctx.beginPath();
      ctx.ellipse(MX, MY, 0.35, 0.14, 0, 0, PI * 2);
      paint(ctx, C.white, { lw: 0.04, dots: C.grey, density: 0.3 });
      person(ctx, MX0, MY0, 0, folk(121, { pose: 'carry', dir: 'l', style: 'short', hat: 'beanie', top: C.teal, bottom: C.ink, arms: [1.0 + sw * 0.2, 0.9 + sw * 0.2] }), t);
      ctx.beginPath();
      ctx.moveTo(MX, MY - 0.05);
      ctx.lineTo(X - 0.7 - sw * 0.1, Y - 1.35);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.1;
      ctx.stroke();
      ctx.strokeStyle = C.woodLight;
      ctx.lineWidth = 0.05;
      ctx.stroke();
      const s = pulse(t, 14) * 14;
      if (Q.detail && s > 2 && s < 5) speech(ctx, MX0, MY0, 2.8, 'SAME PUDDLE. EVERY DAY.', { size: 0.36, dx: 1.4 });
    });
    // wet floor sign
    R.thing(13.9, 6.6, (ctx) => {
      face(ctx, [[13.4, 6.3, 0], [14.2, 6.3, 0], [14.0, 6.6, 1.3], [13.6, 6.6, 1.3]], shade(C.mustard, 0.15), { lw: 0.04 });
      face(ctx, [[13.4, 6.9, 0], [14.2, 6.9, 0], [14.0, 6.6, 1.3], [13.6, 6.6, 1.3]], C.mustard, { lw: 0.04 });
      label(ctx, 13.8, 6.9, 0.75, 'WET!', 0.24, C.ink);
    });

    // ---------- the dog walker, slowly becoming a maypole ----------
    const DX = 10.6, DY = 11.2, DP = 18;
    const spin = (t) => {
      const s = pulse(t, DP) * DP;
      return s < 14 ? s * 0.45 : 14 * 0.45 - (s - 14) * ((14 * 0.45) / 4);
    };
    const tangle = (t) => { const s = pulse(t, DP) * DP; return s < 14 ? s / 14 : 1 - (s - 14) / 4; };
    const DOGS = [
      { color: C.brown, long: true, scale: 0.85, leash: C.coral },
      { color: C.white, spot: C.ink, scale: 1.1, leash: C.teal },
      { color: C.mustard, scale: 0.95, leash: C.purple },
      { color: C.ink, ear: C.navy, scale: 0.7, leash: C.red },
    ];
    const dogPos = (i) => (t) => {
      const a = spin(t) + (i * PI) / 2 + Math.sin(t * 2 + i) * 0.15;
      const r = 1.55 + Math.sin(t * 1.3 + i * 2) * 0.1;
      const x = DX + Math.cos(a) * r, y = DY + Math.sin(a) * r;
      const s = pulse(t, DP) * DP;
      const sg = s < 14 ? 1 : -1;
      const vx = -Math.sin(a) * sg, vy = Math.cos(a) * sg;
      return { x, y, dir: vx - vy >= 0 ? 'r' : 'l' };
    };
    const HAND = (t) => {
      const [X, Y] = P(DX, DY, 0);
      return [X + 0.2, Y - 2.25 + Math.sin(t * 3) * 0.05];
    };
    DOGS.forEach((d, i) => {
      R.mover(dogPos(i), (ctx, t, p) => {
        const [hx, hy] = HAND(t);
        const [X, Y] = P(p.x, p.y, 0);
        const f = p.dir === 'l' ? -1 : 1;
        const cx = X + f * (0.38 + (d.long ? 0.2 : 0)) * d.scale, cy = Y - 0.52 * d.scale;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.quadraticCurveTo((hx + cx) / 2, (hy + cy) / 2 + 0.3, cx, cy);
        ctx.strokeStyle = d.leash;
        ctx.lineWidth = 0.05;
        ctx.stroke();
        dog(ctx, p.x, p.y, t, { ...d, dir: p.dir, phase: i * 2 });
      });
    });
    R.mover(() => ({ x: DX, y: DY }), (ctx, t) => {
      const s = pulse(t, DP) * DP;
      const dir = s < 14 ? (Math.floor(t / 3) % 2 ? 'l' : 'r') : (Math.floor(t * 5) % 2 ? 'l' : 'r');
      person(ctx, DX, DY, 0, folk(101, { pose: 'stand', dir, style: 'pony', hair: C.red, top: C.pink, bottom: C.teal, dress: false, arms: [2.85, -0.4 - tangle(t) * 0.3] }), t);
      // coils of leash around the legs
      const n = Math.round(tangle(t) * 6);
      const [X, Y] = P(DX, DY, 0);
      const cols = [C.coral, C.teal, C.purple, C.red];
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.ellipse(X, Y - 0.25 - i * 0.2, 0.34, 0.1, 0.1 * (i % 2 ? 1 : -1), 0, PI);
        ctx.strokeStyle = cols[i % 4];
        ctx.lineWidth = 0.06;
        ctx.stroke();
      }
      if (Q.detail && s > 9 && s < 12.5) speech(ctx, DX, DY, 2.9, 'SIT! SIT!! SIT!!!', { size: 0.4 });
      if (Q.detail && s > 14.3 && s < 17.5) speech(ctx, DX, DY, 2.9, 'WHEEE', { size: 0.4 });
    });

    // ---------- the front of the hall ----------
    // Bench, with a man reading a paper that is clearly not his
    R.thing(7.9, 15.7, (ctx) => {
      box(ctx, 4.6, 14.9, 0.75, 3.2, 0.8, 0.12, C.wood);
      box(ctx, 4.6, 14.85, 0.87, 3.2, 0.12, 0.9, C.wood);
      for (const x of [4.7, 7.6]) box(ctx, x, 15.55, 0, 0.12, 0.12, 0.75, C.ink, { flat: true, stroke: false });
    }, { depth: 20.5 });
    const ROBE = 20;
    R.mover(() => ({ x: 6.4, y: 15.3 }), (ctx, t) => {
      const s = pulse(t, ROBE) * ROBE;
      const hide = s > 9 && s < 14;
      person(ctx, 6.4, 15.3, 0, {
        skin: '#E3A97F', hair: C.ink, style: 'bald', top: C.white, bottom: C.navy, pose: 'sit', dir: 'l', arms: hide ? [1.9, 1.9] : [1.1, 1.1],
        hold: (g) => {
          g.save();
          g.translate(-0.1, hide ? -0.95 : -0.55);
          g.beginPath();
          g.rect(-0.1, -0.45, 0.95, 0.8);
          paint(g, C.white, { lw: 0.04 });
          if (Q.detail) {
            // the person is drawn mirrored (facing left), so un-mirror the headline
            g.save();
            g.scale(-1, 1);
            g.fillStyle = C.ink;
            g.font = '0.16px "Arial Black", sans-serif';
            g.fillText('GOOSE', -0.76, -0.25);
            g.fillText('AT LARGE', -0.76, -0.08);
            g.restore();
            g.fillStyle = C.grey;
            for (let i = 0; i < 3; i++) g.fillRect(-0.02, 0.02 + i * 0.09, 0.75, 0.04);
          }
          g.restore();
        },
      }, t);
      if (Q.detail && s > 11 && s < 14) speech(ctx, 6.4, 15.3, 3.1, 'NO.', { size: 0.4, dx: -0.6 });
    }, { bias: 0.3 });
    // The paper's real owner, in a dressing gown
    const robe = keys([[0, 4.4, 11.0], [1, 4.4, 11.0], [5, 8.4, 13.6], [7, 8.4, 13.6], [9, 6.3, 14.0], [14, 6.3, 14.0], [18, 4.4, 11.0], [20, 4.4, 11.0]], ROBE);
    R.mover(robe, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { skin: '#F4CDAA', hair: C.mustard, style: 'bun', top: C.pink, dress: true, pose: p.moving ? 'walk' : 'stand', dir: p.s > 9 && p.s < 14 ? 'l' : p.dir, back: p.moving && p.back, shoes: C.blush, speed: 5 }, t);
      if (Q.detail && p.s > 9.3 && p.s < 12) speech(ctx, p.x, p.y, 2.8, 'IS THAT MY PAPER?', { size: 0.4 });
      if (Q.detail && p.s > 1.5 && p.s < 4) speech(ctx, p.x, p.y, 2.8, 'MY PAPER?!', { size: 0.4 });
    });

    // Kid on a scooter doing laps of the lobby
    const scoot = route([[5.2, 10.0], [7.2, 13.6], [12.9, 13.9], [14.9, 11.8], [15.0, 7.0], [10.5, 7.3], [7.2, 9.2]], { speed: 2.6 });
    R.mover(scoot, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, 0);
      const f = p.dir === 'l' ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(X - 0.45 * f, Y - 0.12);
      ctx.lineTo(X + 0.4 * f, Y - 0.12);
      ctx.lineTo(X + 0.34 * f, Y - 1.35);
      ctx.moveTo(X + 0.2 * f, Y - 1.35);
      ctx.lineTo(X + 0.5 * f, Y - 1.35);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.08;
      ctx.stroke();
      ctx.strokeStyle = C.teal;
      ctx.lineWidth = 0.04;
      ctx.stroke();
      for (const dx of [-0.4, 0.4]) {
        ctx.beginPath();
        ctx.arc(X + dx * f, Y - 0.07, 0.08, 0, PI * 2);
        ctx.fillStyle = C.ink;
        ctx.fill();
      }
      person(ctx, p.x, p.y, 0.1, folk(111, { pose: 'skate', dir: p.dir, back: p.back, scale: 0.7, hat: 'helmet', top: C.red, bottom: C.navy, speed: 6 }), t);
    });

    // Doorman, asleep in his armchair, in charge of absolutely nothing
    R.thing(14.2, 13.0, (ctx) => {
      box(ctx, 14.2, 13.0, 0, 1.4, 1.4, 0.7, C.purple, { dots: shade(C.purple, 0.5) });
      box(ctx, 14.2, 13.0, 0.7, 0.35, 1.4, 1.2, C.purple);
      box(ctx, 14.55, 13.0, 0.7, 1.05, 0.25, 0.45, C.purple);
    }, { depth: 27 });
    R.thing(15.6, 14.4, (ctx) => box(ctx, 14.55, 14.15, 0.7, 1.05, 0.25, 0.45, C.purple), { depth: 30 });
    R.mover(() => ({ x: 14.9, y: 13.7 }), (ctx, t) => {
      person(ctx, 14.9, 13.7, 0.05, { skin: '#633F2A', hair: C.ink, style: 'short', top: C.red, bottom: C.navy, hat: 'cap', pose: 'sit', dir: 'r', arms: [0.4, 0.3] }, t);
      if (Q.detail) {
        const k = (t * 0.5) % 1;
        label(ctx, 14.7 - k * 0.5, 13.5 - k * 0.5, 2.7 + k * 1.2, 'z', 0.35 + k * 0.35, alpha(C.ink, 1 - k));
        label(ctx, 14.7 - ((k + 0.5) % 1) * 0.5, 13.5 - ((k + 0.5) % 1) * 0.5, 2.7 + ((k + 0.5) % 1) * 1.2, 'z', 0.35 + ((k + 0.5) % 1) * 0.35, alpha(C.ink, 1 - ((k + 0.5) % 1)));
      }
    }, { bias: 0.5 });
    R.thing(15.3, 12.2, (ctx) => {
      box(ctx, 14.6, 11.6, 0, 0.9, 0.9, 1.1, C.wood);
      label(ctx, 15.05, 12.05, 1.45, 'ASK THE SUPER', 0.16, C.navy, 'Arial Black');
      // service bell
      const [X, Y] = P(15.05, 12.05, 1.1);
      ctx.beginPath();
      ctx.arc(X, Y, 0.16, PI, 0);
      paint(ctx, C.mustard, { lw: 0.03 });
    });

    // A parent rocking a pram. The tuba woke the baby.
    R.mover((t) => ({ x: 10.1 + Math.sin(t * 1.8) * 0.25, y: 15.0 - Math.sin(t * 1.8) * 0.1 }), (ctx, t, p) => {
      const x = p.x, y = p.y;
      box(ctx, x - 0.5, y - 0.35, 0.45, 1.0, 0.7, 0.55, C.teal, { lw: 0.04 });
      face(ctx, [[x - 0.5, y - 0.35, 1.0], [x - 0.5, y + 0.35, 1.0], [x - 0.75, y + 0.35, 1.6], [x - 0.75, y - 0.35, 1.6]], shade(C.teal, 0.15), { lw: 0.04 });
      for (const [wx, wy] of [[x - 0.4, y + 0.38], [x + 0.4, y + 0.38]]) {
        const [X, Y] = P(wx, wy, 0.22);
        ctx.beginPath();
        ctx.arc(X, Y, 0.2, 0, PI * 2);
        paint(ctx, C.white, { lw: 0.05 });
      }
      rod(ctx, [x + 0.5, y, 1.0], [x + 0.95, y, 1.5], C.ink, 0.06);
      const [BX, BY] = P(x - 0.1, y, 1.05);
      ctx.beginPath();
      ctx.arc(BX, BY, 0.2, 0, PI * 2);
      paint(ctx, SKIN_BABY, { lw: 0.035 });
      const s = pulse(t, 9) * 9;
      if (Q.detail && s < 3.5) speech(ctx, x - 0.1, y, 1.6, 'WAAAH', { size: 0.34, fill: C.butter });
    });
    R.mover((t) => ({ x: 11.3 + Math.sin(t * 1.8) * 0.25, y: 15.0 - Math.sin(t * 1.8) * 0.1 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(131, { pose: 'carry', dir: 'l', style: 'bun', top: C.coral, bottom: C.navy, dress: false, arms: [1.4, 1.3] }), t);
      const s = pulse(t, 9) * 9;
      if (Q.detail && s > 4 && s < 7) speech(ctx, p.x, p.y, 2.8, 'SHHH. THANKS, 3A.', { size: 0.36 });
    });

    // Plants
    R.thing(3.7, 15.5, (ctx, t) => plant(ctx, 3.7, 15.5, 0, t, { kind: 'palm', scale: 1.2, potColor: C.teal, leaf: C.green }), { anim: true });
    R.thing(0.6, 15.5, (ctx, t) => plant(ctx, 0.6, 15.5, 0, t, { kind: 'spiky', scale: 1.2, potColor: C.mustard, leaf: C.leaf }), { anim: true });
  },
};
