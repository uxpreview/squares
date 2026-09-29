// The Roller Disco's front. Its door is in the left wall at y 12.5, onto the
// alley between columns 1 and 2 (the street is x < 0; people walk 2 out, so
// anything on the ground stays within 1.2 of the wall). A black blade on a
// pole at the wall's front end (clear of SKATE RENTAL on the wall inside)
// with a neon roller skate and DISCO on it: dark glass by day, buzzing on at
// 8pm. A velvet rope along the wall, and a bouncer on it while it's open.
// Open 8pm to 3am; from 10pm to 1am the late skate: four more on the rink,
// in a conga, doing whatever the DJ says.
import { C, Q, P, box, face, paint, person, folk, label, speech, shade, tint } from '../../../engine/art.js';
import { pulse, clamp } from '../../../engine/actors.js';
import { FRONT, board, doorstep, LIT } from '../style.js';
import { open, rush, nightK, hour } from '../clock.js';
import { openCard } from './kit.js';

const ID = 'disco';
const INK = FRONT[ID];
const PY = 15.25; // the pole, near the wall's front end (the blade has to stay inside the room's picture)
const BX0 = -1.9, BX1 = -0.3, BZ0 = 3.1, BZ1 = 5.9; // the blade, out over the alley (overhead)

// Neon: a bright tube, or dark glass when it's off. (Its glow is the R.light
// by the blade, at night: a canvas shadow blur every frame cost too much.)
function tube(ctx, lit, color) {
  return lit ? tint(color, 0.35) : shade(color, 0.55);
}

// The rink (rooms/disco.js): its middle, and the DJ's REVERSE, every 24
// seconds for the last 6. The late skaters go round with everyone else.
const CX = 9.0, CY = 8.6, CYC = 24, FWD = 18;
const G = (t) => {
  const n = Math.floor(t / CYC), s = t - n * CYC;
  return n * (FWD - (CYC - FWD)) + (s < FWD ? s : FWD - (s - FWD));
};
const reversing = (t) => pulse(t, CYC) * CYC >= FWD;

export default function (R) {
  const pt = (u, v, z) => [-v, u, z]; // u along the wall, v out into the alley

  // The pole and the blade.
  R.thing(-0.2, PY, (ctx) => {
    box(ctx, -0.3, PY - 0.1, 0, 0.2, 0.2, BZ1 + 0.3, C.ink, { flat: true, stroke: false });
    for (const z of [BZ0 + 0.3, BZ1 - 0.3]) face(ctx, [[-0.2, PY, z], [BX0 + 0.1, PY, z]], null, { lw: 0.06 });
    board(ctx, 'x', (BX0 + BX1) / 2, PY, (BZ0 + BZ1) / 2, BX1 - BX0, BZ1 - BZ0, null, { board: INK.board });
    board(ctx, 'x', (BX0 + BX1) / 2, PY, BZ0 - 0.4, BX1 - BX0 + 0.2, 0.55, null, { board: C.night });
  });
  // The neon: a roller skate, DISCO under it and the small print, off by day,
  // stuttering on at 8pm (bzzt), with a hiccup now and then all night.
  R.thing(-0.19, PY + 0.01, (ctx, t) => {
    const o = open(ID, t);
    const on = o > 0.5;
    const h = hour(t);
    const warming = h >= 20 && h < 20.25; // the first few seconds after 8pm
    const stutter = on && ((warming && Math.sin(t * 23) + Math.sin(t * 9) > 0.3) || (pulse(t, 7.3) > 0.94 && Math.sin(t * 70) > 0));
    const lit = on && !stutter;
    if (Q.detail) {
      const x = (BX0 + BX1) / 2;
      // the skate: a boot, a sole and two wheels, in pink tube
      ctx.save();
      const ink = tube(ctx, lit, INK.ink);
      const S = (u, z) => P(x + u, PY + 0.01, z);
      ctx.beginPath();
      const boot = [[-0.45, 5.55], [-0.45, 4.65], [0.55, 4.65], [0.6, 4.85], [0.1, 4.95], [-0.05, 5.55]];
      boot.forEach(([u, z], i) => { const [X, Y] = S(u, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath();
      ctx.strokeStyle = ink; ctx.lineWidth = 0.08; ctx.stroke();
      for (const u of [-0.25, 0.35]) {
        const [X, Y] = S(u, 4.45);
        ctx.beginPath(); ctx.arc(X, Y, 0.16, 0, Math.PI * 2);
        ctx.strokeStyle = tube(ctx, lit, C.tealLight); ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      label(ctx, x, PY + 0.01, 3.75, 'DISCO', 0.5, tube(ctx, lit, INK.ink));
      ctx.restore();
      ctx.save();
      label(ctx, x, PY + 0.01, 2.78, 'REVERSE AT', 0.15, tube(ctx, on, C.butter), 'Rethink Sans');
      label(ctx, x, PY + 0.01, 2.58, 'YOUR OWN RISK', 0.15, tube(ctx, on, C.butter), 'Rethink Sans');
      ctx.restore();
      if (warming && stutter) label(ctx, x - 0.2, PY, BZ1 + 0.5, 'bzzt', 0.34, C.white, 'Rethink Sans');
    }
  }, { anim: true });
  R.light({ at: [(BX0 + BX1) / 2, PY, (BZ0 + BZ1) / 2], r: 3.4, color: C.pink, k: (t) => nightK(t) * open(ID, t) * 0.8 });
  openCard(R, ID, 'y', -0.42, PY - 0.1, 1.45, [-0.18, PY + 0.02]);

  // A step and a mat.
  R.thing(-0.05, 11.4, (ctx) => doorstep(ctx, 'left', 12.5, 2.2, C.pink));

  // The velvet rope: two brass posts along the wall past the door, a red rope.
  const posts = [13.9, 14.9];
  R.thing(-0.35, 14.95, (ctx) => {
    for (const u of posts) {
      const [x, y] = pt(u, 0.35, 0);
      box(ctx, x - 0.07, y - 0.07, 0, 0.14, 0.14, 1.0, C.mustard, { flat: true, lw: 0.03 });
      const [X, Y] = P(x, y, 1.05);
      ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.03 });
    }
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const u = posts[0] + ((posts[1] - posts[0]) * i) / 12;
      const [X, Y] = P(...pt(u, 0.35, 0.95 - Math.sin((i / 12) * Math.PI) * 0.3));
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke();
    ctx.strokeStyle = C.red; ctx.lineWidth = 0.08; ctx.stroke();
  });

  // The bouncer, arms folded, while it's open. He lets everybody in.
  R.mover(() => ({ x: -0.9, y: 14.4 }), (ctx, t) => {
    const o = open(ID, t);
    if (o <= 0) return;
    ctx.save();
    ctx.globalAlpha = o;
    person(ctx, -0.9, 14.4, 0, folk(711, {
      top: C.pink, bottom: C.ink, style: 'bald', dir: 'l', arms: [1.35, -1.35], scale: 1.08,
      face: Q.detail ? (c, hy) => { c.beginPath(); c.roundRect(-0.2, hy - 0.08, 0.36, 0.1, 0.03); c.fillStyle = C.ink; c.fill(); } : undefined,
    }), t);
    ctx.restore();
    if (Q.detail && o > 0.9 && pulse(t, 9) > 0.82) speech(ctx, -0.9, 14.4, 2.9, "YOU'RE ON THE LIST", { size: 0.4 });
  });

  // The doorway glows at night while it's open.
  R.light({ at: [-0.4, 12.5, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });

  // ---------- The late skate, 10pm to 1am ----------
  // Four more on the rink's outside lane, a conga in party hats, fading in
  // as it fills up; they go round with the rest, REVERSE and all. The last
  // one never quite lets go of the one in front.
  const conga = [
    { seed: 721, top: C.tealLight, hat: 'party', say: 'WHOOO' },
    { seed: 722, top: C.pink, hat: 'party' },
    { seed: 723, top: C.butter, hat: 'party' },
    { seed: 724, top: C.lilac, hat: 'none', scale: 0.74 },
  ];
  const RXL = 5.0, RYL = 4.15, PER = 20;
  conga.forEach((m, i) => {
    const delay = i * 0.12;
    const k = (t) => clamp((rush(ID, t) - delay) / (1 - delay));
    R.mover((t) => {
      if (k(t) <= 0) return { x: CX, y: CY + RYL, k: 0 };
      const sg = reversing(t) ? -1 : 1;
      const a = ((G(t) - i * 0.75) / PER) * Math.PI * 2;
      const vx = -Math.sin(a) * RXL * sg, vy = Math.cos(a) * RYL * sg;
      return { x: CX + Math.cos(a) * RXL, y: CY + Math.sin(a) * RYL, k: k(t), dir: vx - vy >= 0 ? 'r' : 'l', back: vx + vy < 0 };
    }, (ctx, t, p) => {
      if (!p.k) return;
      ctx.save();
      ctx.globalAlpha = p.k;
      person(ctx, p.x, p.y, 0, folk(m.seed, {
        pose: 'skate', dir: p.dir, back: p.back, top: m.top, hat: m.hat, scale: m.scale, speed: 6,
        arms: i ? [1.5, 0.8] : undefined,
      }), t);
      if (Q.detail) {
        // skate wheels under the feet
        const [X, Y] = P(p.x, p.y, 0);
        const s = m.scale || 1, f = p.dir === 'l' ? -1 : 1;
        ctx.fillStyle = C.mustard; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025;
        for (const d of [-0.22, 0.02, 0.2, 0.42]) {
          ctx.beginPath(); ctx.arc(X + (d - 0.1) * f * s, Y + 0.05, 0.07 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
      ctx.restore();
      if (m.say && Q.detail && p.k > 0.9) {
        const s = reversing(t) ? 'REVERSE!!' : pulse(t, 6, i) > 0.8 ? m.say : null;
        if (s) speech(ctx, p.x, p.y, 2.8, s, { size: 0.4 });
      }
    });
  });
}
