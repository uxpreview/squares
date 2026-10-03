// Band Practice: a garage rock band whose singer, a goose, has stage fright
// and sings from inside a flight case (a cardboard cut-out takes the mic), a
// drummer with no volume knob, a dog on backing vocals and a neighbor who has
// had enough.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab, floor, tiles,
  speech, shade, tint, alpha, Q, label, P, goose, onLeft, onRight, frame, paintText, note, rng, pick, shelfR, table, mix, SKIN,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp, wave } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

// ---------- The running gag clock ----------
// 0..11 play, 10.6 door opens, 11.4 "KEEP IT DOWN!", band freezes,
// 13.2 the goose honks one lone honk anyway, 14.6 door slams,
// 15.3 drummer counts back in, 16.5 everything, louder.
const CYCLE = 20;
const sOf = (t) => pulse(t, CYCLE) * CYCLE;
const playing = (t) => { const s = sOf(t); return s < 11.2 || s >= 16.5; };
const loud = (t) => { const s = sOf(t); return s >= 16.5 ? 1.5 : s < 11.2 ? 1 : 0; };
const doorOpen = (t) => {
  const s = sOf(t);
  if (s < 10.6 || s > 15.2) return 0;
  if (s < 11.1) return (s - 10.6) / 0.5;
  if (s > 14.7) return 1 - (s - 14.7) / 0.5;
  return 1;
};
const BEAT = 0.5;
const kick = (t) => 1 - pulse(t, BEAT);

// ---------- Local helpers ----------
// Draw in the vertical plane y = y0 (u runs along x, v is height).
function inY(ctx, y0, fn) { ctx.save(); ctx.transform(1, 0.5, 0, -ZK, -y0, y0 / 2); fn(); ctx.restore(); }
// Draw in the vertical plane x = x0 (u runs along y, v is height).
function inX(ctx, x0, fn) { ctx.save(); ctx.transform(-1, 0.5, 0, -ZK, x0, x0 / 2); fn(); ctx.restore(); }

// Where a person's hands are, in the coordinates their `hold` callback gets.
const nearHand = (a) => [Math.sin(a) * 0.72 - 0.13, Math.cos(a) * 0.72 - 0.3];
const farHand = (a) => [Math.sin(a) * 0.72 - 0.57, Math.cos(a) * 0.72 - 0.3];

function speakerCone(ctx, u, v, r, k) {
  ctx.beginPath();
  ctx.arc(u, v, r, 0, Math.PI * 2);
  paint(ctx, C.black, { lw: 0.04 });
  ctx.beginPath();
  ctx.arc(u, v, r * (0.62 + k * 0.14), 0, Math.PI * 2);
  paint(ctx, shade(C.grey, 0.55), { lw: 0.03 });
  ctx.beginPath();
  ctx.arc(u, v, r * (0.22 + k * 0.06), 0, Math.PI * 2);
  paint(ctx, C.grey, { lw: 0.03 });
}

function guitar(ctx, color, bass) {
  // body at the hip, neck up and forward
  ctx.save();
  ctx.translate(0.02, 0.42);
  ctx.rotate(-0.95);
  const L = bass ? 1.25 : 1.0;
  ctx.beginPath();
  ctx.rect(0.1, -0.045, L, 0.09);
  paint(ctx, C.brown, { lw: 0.03 });
  ctx.beginPath();
  ctx.moveTo(L + 0.08, -0.07); ctx.lineTo(L + 0.3, -0.1); ctx.lineTo(L + 0.3, 0.08); ctx.lineTo(L + 0.08, 0.07);
  paint(ctx, C.ink, { lw: 0.03 });
  ctx.beginPath();
  ctx.ellipse(-0.12, 0, 0.3, 0.24, 0, 0, Math.PI * 2);
  ctx.ellipse(0.16, 0, 0.2, 0.17, 0, 0, Math.PI * 2);
  paint(ctx, color, { lw: 0.04, dots: shade(color, 0.4), density: 0.15 });
  ctx.beginPath();
  ctx.ellipse(-0.1, 0.02, 0.1, 0.07, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.restore();
}

function dog(ctx, x, y, z, t, howl) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.55, 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.18);
    ctx.fill();
  }
  const wag = Math.sin(t * (howl ? 14 : 5)) * 0.5;
  // tail
  ctx.beginPath();
  ctx.moveTo(-0.35, -0.35);
  ctx.quadraticCurveTo(-0.6, -0.5, -0.55 + wag * 0.2, -0.85);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.wood; ctx.lineWidth = 0.08; ctx.stroke();
  // sitting body
  ctx.beginPath();
  ctx.ellipse(-0.1, -0.35, 0.38, 0.3, 0, 0, Math.PI * 2);
  paint(ctx, C.wood, { dots: shade(C.wood, 0.45), density: 0.18 });
  ctx.beginPath();
  ctx.ellipse(0.15, -0.55, 0.16, 0.42, 0.35, 0, Math.PI * 2);
  paint(ctx, C.wood);
  // front legs
  ctx.beginPath();
  ctx.roundRect(0.12, -0.35, 0.1, 0.36, 0.04);
  ctx.roundRect(0.28, -0.35, 0.1, 0.36, 0.04);
  paint(ctx, C.woodLight, { lw: 0.04 });
  // head (tilted up to howl)
  ctx.save();
  ctx.translate(0.28, -0.95);
  ctx.rotate(howl ? -0.75 : 0.15);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.22, 0.2, 0, 0, Math.PI * 2);
  ctx.roundRect(0.05, -0.08, 0.34, 0.17, 0.07);
  paint(ctx, C.wood);
  ctx.beginPath();
  ctx.arc(0.38, -0.02, 0.05, 0, Math.PI * 2);
  ctx.fillStyle = C.ink; ctx.fill();
  if (howl) {
    ctx.beginPath();
    ctx.ellipse(0.3, 0.07, 0.06, 0.035, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.coral; ctx.fill();
  }
  // floppy ear
  ctx.beginPath();
  ctx.ellipse(-0.1, 0.05, 0.08, 0.2, howl ? 0.9 : 0.2, 0, Math.PI * 2);
  paint(ctx, C.brown);
  ctx.beginPath();
  ctx.arc(0.08, -0.05, 0.03, 0, Math.PI * 2);
  ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
  // collar
  ctx.beginPath();
  ctx.ellipse(0.2, -0.78, 0.15, 0.05, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = C.red; ctx.fill();
  ctx.restore();
}

// The sky by the hour (as the Lido's), for the slice of outside under the
// garage door and the side door's window.
const SKY = [[0, C.night], [4.5, C.night], [6, C.blush], [8, C.sky], [17, C.sky], [19, C.pink], [20.5, C.purple], [21.5, C.night], [24, C.night]];
function skyAt(h) {
  for (let i = 1; i < SKY.length; i++) {
    const [h0, c0] = SKY[i - 1], [h1, c1] = SKY[i];
    if (h <= h1) return mix(c0, c1, Math.round(((h - h0) / (h1 - h0)) * 20) / 20);
  }
  return C.night;
}
// Where an amp stood, once the band has carried it to the stage: tape on the
// floor round its spot.
function ampSpot(ctx, x, y, w, d) {
  rect(ctx, x, y, w, d, 0.015, alpha(C.ink, 0.08), { lw: 0.05, stroke: C.mustard });
}

export default {
  id: 'band',
  name: 'Band Practice',
  blurb: 'The Honks are rehearsing without their lead singer, who only knows one word anyway. The neighbor has asked nicely nine times.',

  build(R) {
    // The band carries both amps out to the stage at 2pm (day.js) and
    // brings them home about midnight.
    const day = R.opts.day;
    const gone = (t) => { const h = day.hour(t); return h >= 14.25 && h < 23.9; };

    // ---------- Floor and walls ----------
    R.floor((ctx) => {
      slab(ctx, C.grey);
      floor(ctx, C.greyLight, { dots: C.grey, density: 0.12, stroke: false });
      tiles(ctx, 4, alpha(C.ink, 0.35), 0.035);
      // oil stain from the car that no longer fits in here
      disc(ctx, 11.4, 9.0, 0.005, 1.1, alpha(C.ink, 0.12), { stroke: false });
      disc(ctx, 11.9, 8.6, 0.005, 0.5, alpha(C.ink, 0.1), { stroke: false });
      // painted parking line
      face(ctx, [[15.2, 3, 0.01], [15.2, 13.5, 0.01]], null, { lw: 0.22, stroke: alpha(C.mustard, 0.7) });
    });
    R.walls({ left: tint(C.mint, 0.2), right: tint(C.butter, 0.25), cap: C.paper, dotsL: shade(C.mint, 0.25), dotsR: shade(C.butter, 0.25), densL: 0.12, densR: 0.12 });

    // ---------- Wall decor ----------
    R.decor((ctx) => {
      // cinder block lines on both walls
      if (Q.detail) {
        for (let z = 0.6; z < 6; z += 0.6) {
          face(ctx, [[0.01, 0, z], [0.01, 16, z]], null, { lw: 0.02, stroke: alpha(C.ink, 0.2) });
          face(ctx, [[0, 0.01, z], [16, 0.01, z]], null, { lw: 0.02, stroke: alpha(C.ink, 0.2) });
        }
      }
      // egg carton "soundproofing" on the right wall
      onRight(ctx, 0.5, 2.3, 4.2, 3.2, C.greyLight);
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 5; j++) {
          const c = (i + j) % 2 ? C.greyLight : C.paperDeep;
          onRight(ctx, 0.6 + i * 0.57, 2.4 + j * 0.6, 0.5, 0.52, c, { dots: C.grey, density: 0.22, lw: 0.025 });
        }
      }
      paintText(ctx, 'right', 2.6, 1.9, 'SOUNDPROOF (ISH)', 0.28, alpha(C.ink, 0.7), 'Rethink Sans');

      // gig posters on the left wall
      frame(ctx, 'left', 0.7, 2.9, 1.3, 1.9, C.coral, (g) => {
        paintText(g, 'left', 1.35, 4.35, 'THE', 0.3, C.white);
        paintText(g, 'left', 1.35, 3.95, 'HONKS', 0.36, C.butter);
        paintText(g, 'left', 1.35, 3.35, 'LIVE!', 0.34, C.white);
      });
      frame(ctx, 'left', 2.35, 3.3, 1.2, 1.6, C.teal, (g) => {
        paintText(g, 'left', 2.95, 4.4, 'GOOSE', 0.26, C.white);
        paintText(g, 'left', 2.95, 4.05, 'STOCK', 0.26, C.white);
        paintText(g, 'left', 2.95, 3.6, 'SAT', 0.22, C.mustard);
      });
      frame(ctx, 'left', 3.95, 2.7, 1.1, 1.5, C.mustard, (g) => {
        paintText(g, 'left', 4.5, 3.85, 'BATTLE', 0.2, C.ink);
        paintText(g, 'left', 4.5, 3.55, 'OF THE', 0.18, C.ink);
        paintText(g, 'left', 4.5, 3.2, 'BANDS', 0.24, C.coral);
      });
      frame(ctx, 'left', 3.9, 4.55, 0.8, 0.9, C.pink, (g) => {
        paintText(g, 'left', 4.3, 5.0, '1-2-3-4', 0.16, C.ink);
      });

      // bedsheet banner
      if (Q.detail) {
        const pts = [[0, 5.0, 5.4], [0, 10.5, 5.4]];
        for (let i = 10; i >= 0; i--) pts.push([0, 5.0 + (i / 10) * 5.5, 3.75 + Math.sin(i * 1.9) * 0.08]);
        face(ctx, pts, C.white, { dots: C.paperDeep, density: 0.25 });
      } else onLeft(ctx, 5.0, 3.8, 5.5, 1.6, C.white);
      paintText(ctx, 'left', 7.75, 4.7, 'THE HONKS', 0.95, C.coral);
      paintText(ctx, 'left', 7.75, 4.05, 'WORLD TOUR (THIS GARAGE)', 0.26, C.navy, 'Rethink Sans');

      // side door frame (the door itself is animated)
      onLeft(ctx, 11.05, 0, 2.1, 3.35, C.white);

      // bicycle hanging on the left wall
      if (Q.detail) {
        inX(ctx, 0.02, () => {
          for (const u of [13.9, 15.2]) {
            ctx.beginPath(); ctx.arc(u, 3.3, 0.5, 0, Math.PI * 2);
            ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
          }
          ctx.beginPath();
          ctx.moveTo(13.9, 3.3); ctx.lineTo(14.4, 3.3); ctx.lineTo(14.9, 3.8); ctx.lineTo(15.2, 3.3);
          ctx.moveTo(14.4, 3.3); ctx.lineTo(14.25, 3.85); ctx.lineTo(14.9, 3.8);
          ctx.strokeStyle = C.red; ctx.lineWidth = 0.08; ctx.stroke();
        });
      }

      // pegboard with tool outlines above the paint shelf
      onRight(ctx, 13.7, 2.8, 2.1, 2.3, C.woodLight, { dots: shade(C.wood, 0.3), density: 0.3 });
      if (Q.detail) {
        inY(ctx, 0.02, () => {
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
          // hammer
          ctx.fillStyle = C.grey;
          ctx.fillRect(14.0, 4.5, 0.4, 0.14);
          ctx.beginPath(); ctx.moveTo(14.2, 4.5); ctx.lineTo(14.2, 3.8);
          ctx.strokeStyle = C.brown; ctx.lineWidth = 0.08; ctx.stroke();
          // wrench
          ctx.beginPath(); ctx.moveTo(14.7, 4.7); ctx.lineTo(14.7, 3.7);
          ctx.strokeStyle = C.grey; ctx.lineWidth = 0.09; ctx.stroke();
          ctx.beginPath(); ctx.arc(14.7, 4.75, 0.1, 0, Math.PI * 2); ctx.stroke();
          // saw outline, empty (someone borrowed it)
          ctx.setLineDash([0.08, 0.06]);
          ctx.beginPath();
          ctx.moveTo(15.1, 3.2); ctx.lineTo(15.6, 3.5); ctx.lineTo(15.6, 4.8); ctx.lineTo(15.1, 4.8); ctx.closePath();
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // setlist on the garage door
      paintText(ctx, 'right', 10.4, 5.0, '~ PLEASE CLOSE THE DOOR ~', 0.24, alpha(C.ink, 0.6), 'Rethink Sans');
    });

    // Garage door, raised a little: passers-by walk past outside.
    const GX0 = 7.4, GX1 = 13.2, GAP = 0.85;
    R.decor((ctx, t) => {
      // the gap under the door, a slice of outside
      inY(ctx, 0.01, () => {
        ctx.beginPath();
        ctx.rect(GX0, 0, GX1 - GX0, GAP);
        ctx.fillStyle = skyAt(day.hour(t));
        ctx.fill();
        ctx.fillStyle = C.greyLight;
        ctx.fillRect(GX0, 0, GX1 - GX0, 0.18);
        if (!Q.detail) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(GX0, 0, GX1 - GX0, GAP);
        ctx.clip();
        // legs walking by: a jogger, a dog walker with dog, a pizza delivery
        const walkers = [
          { speed: 1.4, off: 0, col: C.navy, shoe: C.coral },
          { speed: 0.8, off: 4, col: C.brown, shoe: C.ink, dog: true },
          { speed: -1.0, off: 7, col: C.red, shoe: C.white },
        ];
        const span = GX1 - GX0 + 3;
        walkers.forEach((w, i) => {
          const u0 = (((t * w.speed + w.off * 3) % span) + span) % span;
          const u = w.speed > 0 ? GX0 - 1.5 + u0 : GX1 + 1.5 - u0;
          const sw = Math.sin(t * 8 + i) * 0.14;
          ctx.lineCap = 'round';
          for (const [dx, s] of [[-0.08, sw], [0.08, -sw]]) {
            ctx.beginPath(); ctx.moveTo(u + dx, 1.2); ctx.lineTo(u + dx + s, 0.12);
            ctx.strokeStyle = w.col; ctx.lineWidth = 0.12; ctx.stroke();
            ctx.beginPath(); ctx.ellipse(u + dx + s + 0.05 * Math.sign(w.speed), 0.1, 0.1, 0.05, 0, 0, Math.PI * 2);
            ctx.fillStyle = w.shoe; ctx.fill();
          }
          if (w.dog) {
            const du = u + 0.9;
            ctx.fillStyle = C.ink;
            for (let k = 0; k < 4; k++) {
              const lx = du - 0.25 + k * 0.17 + (k % 2 ? sw : -sw) * 0.4;
              ctx.fillRect(lx, 0.08, 0.05, 0.3);
            }
            ctx.beginPath(); ctx.ellipse(du, 0.45, 0.35, 0.12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(u, 0.85); ctx.lineTo(du + 0.3, 0.5); ctx.strokeStyle = C.red; ctx.lineWidth = 0.03; ctx.stroke();
          }
        });
        ctx.restore();
      });
      // the door itself, ribbed
      onRight(ctx, GX0, GAP, GX1 - GX0, 4.4 - GAP, C.white, { dots: C.greyLight, density: 0.3 });
      if (Q.detail) {
        for (let z = GAP + 0.45; z < 4.4; z += 0.45) face(ctx, [[GX0, 0.01, z], [GX1, 0.01, z]], null, { lw: 0.03, stroke: C.grey });
      }
      face(ctx, [[GX0, 0.01, GAP], [GX1, 0.01, GAP]], null, { lw: 0.08, stroke: C.ink });
      // handle
      onRight(ctx, (GX0 + GX1) / 2 - 0.3, GAP + 0.1, 0.6, 0.12, C.ink);
    }, { anim: true });

    // Fairy lights looping along the top of both walls.
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      const cols = [C.mustard, C.coral, C.tealLight, C.pink, C.butter];
      const strands = [
        (k) => [0.05, 0.3 + k * 15.4],
        (k) => [0.3 + k * 15.4, 0.05],
      ];
      strands.forEach((fn, si) => {
        const n = 64;
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          const seg = (k * 7) % 1;
          const [x, y] = fn(k);
          pts.push(P(x, y, 5.5 - Math.sin(seg * Math.PI) * 0.45));
        }
        ctx.beginPath();
        pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.035;
        ctx.stroke();
        const step = Math.floor(t * 4);
        for (let i = 2; i < n; i += 2) {
          const [X, Y] = pts[i];
          const on = (i / 2 + step + si) % 3 !== 0;
          const c = cols[(i / 2 + si) % cols.length];
          if (on) {
            ctx.beginPath();
            ctx.arc(X, Y + 0.12, 0.26, 0, Math.PI * 2);
            ctx.fillStyle = alpha(c, 0.3);
            ctx.fill();
          }
          ctx.beginPath();
          ctx.ellipse(X, Y + 0.12, 0.08, 0.11, 0, 0, Math.PI * 2);
          ctx.fillStyle = on ? c : shade(c, 0.5);
          ctx.fill();
        }
      });
    }, { anim: true });

    // ---------- Floor stuff: rugs, cables, clutter ----------
    const PEPPERONI = [[3.6, 12.9], [3.9, 13.2], [3.55, 13.25], [3.95, 12.8], [3.75, 13.4], [3.35, 13.05]];
    const PICK = [4.12, 13.05];
    R.rug((ctx) => {
      // drum rug
      rect(ctx, 1.3, 1.3, 5.0, 5.0, 0.01, C.red, { dots: shade(C.red, 0.4), density: 0.2 });
      rect(ctx, 1.6, 1.6, 4.4, 4.4, 0.012, null, { lw: 0.06, stroke: C.mustard });
      // tangled cables
      if (Q.detail) {
        const r = rng(5);
        const lines = [
          [[5.8, 1.5], [8.3, 4.8], C.ink],
          [[1.6, 5.9], [4.8, 9.2], C.ink],
          [[10.0, 10.4], [12.6, 6.6], C.navy],
          [[12.6, 6.4], [6.4, 1.6], C.ink],
          [[8.4, 8.4], [3.6, 3.8], C.coral],
          [[8.4, 8.4], [9.9, 10.3], C.navy],
          [[8.4, 8.4], [1.4, 13.9], C.mustard],
        ];
        for (const [[ax, ay], [bx, by], col] of lines) {
          ctx.beginPath();
          const n = 90;
          const loops = 2 + Math.floor(r() * 3);
          const ph = r() * 6;
          const len = Math.hypot(bx - ax, by - ay);
          const nx = -(by - ay) / len, ny = (bx - ax) / len;
          for (let i = 0; i <= n; i++) {
            const k = i / n;
            // gentle meander plus a few curly loops along the way
            const mean = Math.sin(k * Math.PI * 2 + ph) * 0.35 * Math.sin(k * Math.PI);
            const la = k * Math.PI * 2 * loops * 2;
            const lw = 0.22 * Math.max(0, Math.sin(k * Math.PI * loops)) ** 2;
            const x = ax + (bx - ax) * k + nx * mean + Math.cos(la) * lw;
            const y = ay + (by - ay) * k + ny * mean + Math.sin(la) * lw;
            const [X, Y] = P(x, y, 0.03);
            i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          }
          ctx.lineCap = 'round';
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineJoin = 'round'; ctx.stroke();
          ctx.strokeStyle = col === C.ink ? C.black : col; ctx.lineWidth = 0.055; ctx.stroke();
        }
        // the Great Knot, center stage
        ctx.beginPath();
        for (let i = 0; i <= 160; i++) {
          const a = i * 0.37;
          const rr = 0.25 + 0.45 * Math.abs(Math.sin(i * 0.13));
          const [X, Y] = P(7.3 + Math.cos(a) * rr, 8.1 + Math.sin(a * 1.3) * rr, 0.04);
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
        ctx.strokeStyle = C.black; ctx.lineWidth = 0.05; ctx.stroke();
      }
      // power strip
      box(ctx, 8.0, 8.1, 0, 0.9, 0.35, 0.12, C.white);
      // setlist taped to the floor by the mic
      rect(ctx, 11.0, 11.3, 0.8, 1.0, 0.02, C.white, { lw: 0.04 });
      if (Q.detail) for (let i = 0; i < 5; i++) face(ctx, [[11.15, 11.45 + i * 0.16, 0.03], [11.6 - (i % 2) * 0.15, 11.45 + i * 0.16, 0.03]], null, { lw: 0.04, stroke: C.navy });
      // pizza box and cans
      rect(ctx, 3.1, 12.4, 1.3, 1.3, 0.02, C.woodLight, { lw: 0.04 });
      disc(ctx, 3.75, 13.05, 0.04, 0.5, C.mustard, { lw: 0.03 });
      for (const [px, py] of PEPPERONI) disc(ctx, px, py, 0.05, 0.08, C.red, { stroke: false });
      // the guitar pick, one of the toppings (a find)
      {
        const [X, Y] = P(PICK[0], PICK[1], 0.06);
        ctx.beginPath();
        ctx.moveTo(X - 0.11, Y - 0.04); ctx.quadraticCurveTo(X, Y - 0.11, X + 0.11, Y - 0.04); ctx.lineTo(X + 0.01, Y + 0.09); ctx.closePath();
        paint(ctx, C.red, { lw: 0.02 });
      }
      // skateboard
      box(ctx, 6.2, 14.4, 0.12, 1.5, 0.45, 0.06, C.teal, { top: C.coral });
      for (const [wx, wy] of [[6.4, 14.5], [7.5, 14.5]]) disc(ctx, wx, wy + 0.4, 0.06, 0.07, C.ink, { stroke: false });
    });
    R.rug((ctx, t) => {
      // the power strip's little light
      const [X, Y] = P(8.2, 8.3, 0.13);
      ctx.beginPath();
      ctx.arc(X, Y, 0.06, 0, Math.PI * 2);
      ctx.fillStyle = playing(t) ? C.red : shade(C.red, 0.6);
      ctx.fill();
    }, { anim: true });

    // soda cans scattered about
    for (const [cx, cy, c] of [[2.6, 11.4, C.red], [9.2, 12.6, C.teal], [13.0, 9.3, C.mustard], [6.8, 6.9, C.red]]) {
      R.thing(cx, cy, (ctx) => cylinder(ctx, cx, cy, 0, 0.11, 0.32, c, { top: C.grey }));
    }

    // ---------- Big furniture along the walls ----------
    // Guitar amp stack against the right wall, speaker cones pulse
    R.thing(6.6, 1.4, (ctx, t) => {
      if (gone(t)) {
        ampSpot(ctx, 5.0, 0.3, 1.6, 1.1);
        // a sign propped where it stood
        face(ctx, [[5.1, 0.45, 0], [6.5, 0.45, 0], [6.45, 0.25, 1.0], [5.15, 0.25, 1.0]], C.woodLight, { lw: 0.04, dots: C.wood, density: 0.2 });
        label(ctx, 5.8, 0.45, 0.68, 'GONE TO', 0.22, C.coral);
        label(ctx, 5.8, 0.45, 0.36, 'THE GIG', 0.22, C.coral);
        return;
      }
      const k = kick(t) * loud(t);
      const sh = loud(t) > 1 ? Math.sin(t * 60) * 0.03 : 0;
      ctx.save();
      ctx.translate(sh, 0);
      box(ctx, 5.0, 0.3, 0, 1.6, 1.1, 1.3, C.black, { top: C.ink });
      box(ctx, 5.0, 0.3, 1.32, 1.6, 1.1, 1.3, C.black, { top: C.ink });
      box(ctx, 5.0, 0.35, 2.64, 1.6, 1.0, 0.55, C.black, { top: C.ink });
      if (Q.detail) {
        inY(ctx, 1.4, () => {
          for (const vz of [0.05, 1.37]) {
            ctx.beginPath(); ctx.rect(5.08, vz + 0.05, 1.44, 1.1);
            paint(ctx, shade(C.navy, 0.4), { lw: 0.03, dots: C.ink, density: 0.3 });
            for (const [u, v] of [[5.43, 0.33], [6.17, 0.33], [5.43, 0.87], [6.17, 0.87]]) speakerCone(ctx, u, vz + v, 0.25, k);
          }
          ctx.beginPath(); ctx.rect(5.1, 2.72, 1.4, 0.36);
          paint(ctx, C.mustard, { lw: 0.03 });
          for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(5.3 + i * 0.2, 2.86, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); }
        });
        label(ctx, 5.8, 1.4, 3.45, 'LOUD', 0.26, C.butter);
      }
      ctx.restore();
    }, { anim: true });

    // The stack answers a tap (while it's here, not at the gig).
    R.poke({ id: 'amp', at: (t) => (gone(t) ? [-60, -60, 0] : [5.8, 0.85, 2.0]), r: 1.2, sound: 'clunk', say: ['TOO LOUD.', 'IT GOES TO ELEVEN.', 'STILL TOO LOUD.'] });
    // The neighbor's side of the wall knocks back.
    R.poke({ id: 'wall', at: [0, 12.1, 1.7], r: 1.1, sound: 'clunk', say: ['PLEASE.', 'Ten times now.', 'I have a pot roast in.'] });

    // Bass amp against the left wall, cone faces the room
    R.thing(1.6, 6.6, (ctx, t) => {
      if (gone(t)) { ampSpot(ctx, 0.3, 5.1, 1.3, 1.5); return; }
      const k = kick(t) * loud(t);
      box(ctx, 0.3, 5.1, 0, 1.3, 1.5, 1.7, C.navy, { top: C.ink });
      if (Q.detail) {
        inX(ctx, 1.6, () => {
          ctx.beginPath(); ctx.rect(5.2, 0.1, 1.3, 1.3);
          paint(ctx, shade(C.navy, 0.4), { lw: 0.03, dots: C.ink, density: 0.3 });
          speakerCone(ctx, 5.85, 0.75, 0.55, k);
          ctx.beginPath(); ctx.rect(5.25, 1.45, 1.2, 0.2);
          paint(ctx, C.greyLight, { lw: 0.03 });
        });
      }
    }, { anim: true });

    // Old couch against the left wall
    R.thing(1.9, 10.4, (ctx) => {
      box(ctx, 0.3, 7.3, 0, 1.6, 3.2, 0.7, C.purple);
      box(ctx, 0.3, 7.3, 0.7, 0.5, 3.2, 1.0, C.purple);
      box(ctx, 0.3, 7.1, 0, 1.6, 0.35, 1.05, shade(C.purple, 0.1));
      box(ctx, 0.3, 10.3, 0, 1.6, 0.35, 1.05, shade(C.purple, 0.1));
      // duct tape patch
      rect(ctx, 1.1, 9.4, 0.4, 0.5, 0.71, C.grey, { lw: 0.03 });
    });

    // Paint shelf against the right wall
    R.thing(15.8, 1.1, (ctx) => {
      shelfR(ctx, 13.7, 2.1, 2.4, 3, 9, C.wood, (g, x, z, w, r, i) => {
        let xx = x + 0.15;
        while (xx < x + w - 0.45) {
          const c = pick(r, [C.coral, C.teal, C.mustard, C.navy, C.pink, C.white]);
          if (i === 2 && r() < 0.4) {
            box(g, xx, 0.3, z, 0.55, 0.5, 0.35, C.red, { top: shade(C.red, 0.1) });
            xx += 0.62;
            continue;
          }
          cylinder(g, xx + 0.2, 0.55, z, 0.2, 0.42, C.greyLight, { top: c });
          face(g, [[xx + 0.2 + 0.14, 0.7, z + 0.42], [xx + 0.2 + 0.14, 0.7, z + 0.2]], null, { lw: 0.07, stroke: c });
          xx += 0.46;
        }
      });
    });

    // Mini fridge with a lava lamp on top
    R.thing(1.5, 14.9, (ctx, t) => {
      box(ctx, 0.3, 13.6, 0, 1.2, 1.25, 1.5, C.white, { top: C.greyLight });
      face(ctx, [[1.5, 13.7, 1.0], [1.5, 14.75, 1.0]], null, { lw: 0.04 });
      face(ctx, [[1.5, 14.7, 1.15], [1.5, 14.7, 1.4]], null, { lw: 0.08 });
      // stickers
      if (Q.detail) {
        const [X, Y] = P(1.5, 14.1, 0.6);
        ctx.beginPath(); ctx.arc(X, Y, 0.14, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
        const [X2, Y2] = P(1.5, 14.45, 0.35);
        ctx.beginPath(); ctx.rect(X2 - 0.12, Y2 - 0.08, 0.24, 0.16); paint(ctx, C.coral, { lw: 0.03 });
      }
      // lava lamp
      const [lx, ly] = P(0.9, 14.2, 1.5);
      ctx.beginPath();
      ctx.moveTo(lx - 0.12, ly); ctx.lineTo(lx - 0.2, ly - 0.25); ctx.lineTo(lx - 0.1, ly - 0.85); ctx.lineTo(lx + 0.1, ly - 0.85); ctx.lineTo(lx + 0.2, ly - 0.25); ctx.lineTo(lx + 0.12, ly);
      ctx.closePath();
      paint(ctx, C.purple, { lw: 0.04 });
      if (Q.detail) {
        for (let i = 0; i < 2; i++) {
          const b = (Math.sin(t * 0.7 + i * 2.2) + 1) / 2;
          ctx.beginPath();
          ctx.ellipse(lx, ly - 0.3 - b * 0.4, 0.06 + i * 0.02, 0.08, 0, 0, Math.PI * 2);
          ctx.fillStyle = C.coral;
          ctx.fill();
        }
      }
      ctx.beginPath();
      ctx.moveTo(lx - 0.1, ly - 0.85); ctx.lineTo(lx, ly - 1.0); ctx.lineTo(lx + 0.1, ly - 0.85);
      paint(ctx, C.grey, { lw: 0.03 });
    }, { anim: true });

    // Side door: the panel swings open when the neighbor comes over.
    R.decor((ctx, t) => {
      const o = doorOpen(t);
      if (o <= 0) {
        onLeft(ctx, 11.2, 0, 1.8, 3.2, C.teal, { dots: shade(C.teal, 0.3), density: 0.15 });
        const sky = skyAt(day.hour(t));
        onLeft(ctx, 11.45, 1.9, 1.3, 1.0, sky, { dots: tint(sky, 0.5), density: 0.2 });
        onLeft(ctx, 11.45, 0.35, 1.3, 1.2, shade(C.teal, 0.1));
        const [X, Y] = P(0, 11.45, 1.5);
        ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2); ctx.fillStyle = C.mustard; ctx.fill();
      } else {
        onLeft(ctx, 11.2, 0, 1.8, 3.2, C.night, { dots: C.navy, density: 0.3 });
        // porch light outside
        onLeft(ctx, 11.4, 0, 1.4, 0.1, C.butter, { stroke: false });
      }
    }, { anim: true });
    R.thing(1.8, 11.2, (ctx, t) => {
      const o = doorOpen(t);
      if (o <= 0) return;
      const a = o * 1.35;
      const tx = Math.sin(a) * 1.8, ty = 11.2 + Math.cos(a) * 1.8;
      face(ctx, [[0, 11.2, 0], [tx, ty, 0], [tx, ty, 3.2], [0, 11.2, 3.2]], C.teal, { dots: shade(C.teal, 0.4), density: 0.2 });
      face(ctx, [[tx * 0.14, 11.2 + (ty - 11.2) * 0.14, 1.9], [tx * 0.86, 11.2 + (ty - 11.2) * 0.86, 1.9], [tx * 0.86, 11.2 + (ty - 11.2) * 0.86, 2.9], [tx * 0.14, 11.2 + (ty - 11.2) * 0.14, 2.9]], C.sky);
    }, { anim: true, depth: 13.3 });

    // The neighbor, in a bathrobe and curlers, hands clamped over ears
    R.mover((t) => {
      const s = sOf(t);
      const o = doorOpen(t);
      return { x: 0.2 + o * 0.35, y: 12.4, o, s };
    }, (ctx, t, p) => {
      if (p.o <= 0.05) return;
      ctx.save();
      ctx.globalAlpha = clamp(p.o * 1.5);
      const shout = p.s > 11.3 && p.s < 14.3;
      person(ctx, p.x, p.y, 0, {
        skin: SKIN[0], hair: C.pink, style: 'curly', top: C.lilac, dress: true, dir: 'r',
        pose: 'stand', arms: shout ? [2.95 + wave(t, 20, 0.05), -2.95] : [0.3, -0.3],
      }, t);
      // curlers
      if (Q.detail) {
        const [X, Y] = P(p.x, p.y, 0);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.roundRect(X - 0.3 + i * 0.16, Y - 2.35 - (i % 2) * 0.06, 0.12, 0.2, 0.05);
          paint(ctx, C.sky, { lw: 0.025 });
        }
      }
      ctx.restore();
    }, { bias: -0.2 });

    // ---------- The band ----------
    // Drum kit
    const KX = 4.1, KY = 4.1;
    const drumHead = (ctx, cx, cy, z, r, color, k = 0) => {
      const [X, Y] = P(cx, cy, z);
      const rx = r * Math.SQRT2 * (1 + k * 0.04), ry = r * ZK * (1 + k * 0.04);
      const depth = 0.55;
      ctx.beginPath();
      ctx.ellipse(X, Y - depth, rx, ry, 0, Math.PI, 0);
      ctx.lineTo(X + rx, Y);
      ctx.ellipse(X, Y, rx, ry, 0, 0, Math.PI);
      ctx.closePath();
      paint(ctx, color, { dots: shade(color, 0.45), density: 0.2 });
      ctx.beginPath();
      ctx.ellipse(X, Y, rx, ry, 0, 0, Math.PI * 2);
      paint(ctx, C.white, { dots: C.greyLight, density: 0.2 });
    };
    const tom = (ctx, cx, cy, z, r, h, color) => {
      cylinder(ctx, cx, cy, z, r, h, color, { top: C.white });
      if (Q.detail) face(ctx, [[cx, cy, z + h * 0.5], [cx, cy, z]], null, { lw: 0.06 });
    };
    const cymbal = (ctx, cx, cy, z, r, wob) => {
      box(ctx, cx - 0.03, cy - 0.03, 0, 0.06, 0.06, z, C.ink, { flat: true, stroke: false });
      const [X, Y] = P(cx, cy, z);
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(wob);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * Math.SQRT2, r * 0.45, 0, 0, Math.PI * 2);
      paint(ctx, C.mustard, { dots: shade(C.mustard, 0.35), density: 0.2, lw: 0.04 });
      ctx.beginPath();
      ctx.ellipse(0, -0.03, 0.08, 0.04, 0, 0, Math.PI * 2);
      ctx.fillStyle = shade(C.mustard, 0.3); ctx.fill();
      ctx.restore();
    };
    // drummer's throne
    R.thing(KX - 1.1, KY - 1.1, (ctx) => {
      cylinder(ctx, KX - 1.2, KY - 1.2, 0, 0.08, 0.7, C.ink, { flat: true });
      cylinder(ctx, KX - 1.2, KY - 1.2, 0.7, 0.35, 0.15, C.black);
    });
    // Drummer: stands, flails, twirls a stick every few seconds
    R.mover(() => ({ x: KX - 1.0, y: KY - 1.0 }), (ctx, t, p) => {
      const s = sOf(t);
      const on = playing(t);
      const counting = s > 15.3 && s < 16.5;
      const sp = loud(t) > 1 ? 17 : 12.57;
      const ph = t * sp;
      const sn = Math.sin(ph);
      let aA = 1.2 + sn * 0.5, aB = 1.2 - sn * 0.5;
      if (!on && !counting) { aA = 0.35; aB = 0.25; }
      if (counting) { const c = Math.sin(t * 25.1) * 0.12; aA = Math.PI - 0.55 + c; aB = -Math.PI + 0.55 - c; }
      const twirl = on ? pulse(t, 4, 0.6) : 1;
      const tossing = twirl < 0.22;
      const [X, Y] = P(p.x, p.y, 0);
      ctx.save();
      if (on) { ctx.translate(X, Y); ctx.rotate(Math.sin(ph * 0.5) * 0.1); ctx.translate(-X, -Y); }
      person(ctx, p.x, p.y, 0, {
        skin: SKIN[3], hair: C.mustard, style: 'long', top: C.teal, bottom: C.ink, dir: 'r',
        pose: on ? 'drum' : 'stand', arms: [aA, aB], hat: 'none',
        hold(g) {
          const stick = (hx, hy, a, len = 0.55) => {
            g.beginPath();
            g.moveTo(hx, hy);
            g.lineTo(hx + Math.sin(a) * len, hy + Math.cos(a) * len);
            g.strokeStyle = C.ink; g.lineWidth = 0.09; g.lineCap = 'round'; g.stroke();
            g.strokeStyle = C.woodLight; g.lineWidth = 0.05; g.stroke();
          };
          const [fx, fy] = farHand(aB);
          stick(fx, fy, aB + 0.9);
          const [nx, ny] = nearHand(aA);
          if (!tossing) stick(nx, ny, aA + (counting ? -2.2 : 0.9));
          else {
            const q = twirl / 0.22;
            const hx = nx, hy = ny - Math.sin(q * Math.PI) * 1.5;
            g.save(); g.translate(hx, hy); g.rotate(q * Math.PI * 6);
            stick(-0.27, 0, Math.PI / 2, 0.55);
            g.restore();
          }
        },
      }, t);
      ctx.restore();
    }, { bias: 0.1 });
    // sweat drops flying off the drummer
    R.air((ctx, t) => {
      if (!Q.detail || !playing(t)) return;
      particles(t, 8, 0.8, (k, r) => {
        const a = r() * Math.PI - Math.PI;
        const d = k * (0.8 + r() * 0.6);
        const [X, Y] = P(KX - 1.0, KY - 1.0, 2.2);
        ctx.beginPath();
        ctx.arc(X + Math.cos(a) * d, Y + Math.sin(a) * d * 0.6 + k * k * 0.8, 0.05, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.sky, 1 - k);
        ctx.fill();
      }, 3);
    });
    // The kit answers a tap with a rimshot (the one a first visit is nudged to).
    const rimshot = R.poke({ id: 'kit', at: [KX + 0.2, KY + 0.2, 1.0], r: 1.4, sound: 'tick', hold: 0.7, teach: true, say: ['BA DUM TSS.', 'BA DUM TSS!', 'Thank you, we are The Honks.'] });
    // Kit (in front of the drummer)
    R.thing(KX + 1.1, KY + 1.1, (ctx, t) => {
      const on = playing(t) || rimshot.k() > 0.01;
      const k = on ? kick(t) : 0;
      const hit = (off) => (on ? Math.sin(t * 12.57 + off) * 0.14 : 0);
      cymbal(ctx, KX - 1.3, KY + 0.6, 1.7, 0.42, hit(0.5)); // hi-hat
      cymbal(ctx, KX + 0.9, KY - 1.1, 2.5, 0.6, hit(1.7)); // crash
      tom(ctx, KX + 0.3, KY - 1.0, 0, 0.45, 0.95, C.coral); // floor tom
      tom(ctx, KX - 0.7, KY + 0.1, 0.9, 0.36, 0.35, C.coral); // snare
      drumHead(ctx, KX + 0.2, KY + 0.2, 0.62, 0.62, C.coral, k); // kick
      // the band logo on the kick
      if (Q.detail) label(ctx, KX + 0.2, KY + 0.2, 0.62, 'HONKS', 0.26, C.coral);
      tom(ctx, KX - 0.15, KY - 0.35, 1.25, 0.26, 0.3, C.coral);
      tom(ctx, KX + 0.35, KY - 0.75, 1.3, 0.26, 0.3, C.coral);
      cymbal(ctx, KX - 0.2, KY + 1.2, 2.2, 0.55, hit(2.9)); // ride
      // the rimshot's crash: a burst off the crash cymbal
      const rk = rimshot.k();
      if (rk > 0.01) {
        const [X, Y] = P(KX + 0.9, KY - 1.1, 2.5);
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2, rr = (i % 2 ? 0.35 : 0.9) * rk;
          ctx.lineTo(X + Math.cos(a) * rr * 1.3, Y + Math.sin(a) * rr * 0.7);
        }
        ctx.closePath();
        paint(ctx, alpha(C.butter, 0.85), { lw: 0.03 });
      }
    }, { anim: true });

    // Guitarist: jumping on the beat
    const GT = { x: 8.6, y: 4.4 };
    R.mover(() => GT, (ctx, t, p) => {
      const on = playing(t);
      const strum = on ? Math.sin(t * 25.1) * 0.25 : 0;
      const aA = on ? 0.55 + strum : 0.4, aB = 1.4;
      person(ctx, p.x, p.y, 0, {
        skin: SKIN[0], hair: C.ink, style: 'short', top: C.ink, bottom: C.red, dir: 'l',
        pose: on ? 'jump' : 'stand', speed: loud(t) > 1 ? 7.5 : 6.283, phase: 0, arms: [aA, aB], shoes: C.white,
        hold: (g) => guitar(g, C.red, false),
      }, t);
    });
    // Bassist: jumping on the off-beat
    const BS = { x: 4.9, y: 9.3 };
    R.mover(() => BS, (ctx, t, p) => {
      const on = playing(t);
      const strum = on ? Math.sin(t * 12.57) * 0.2 : 0;
      person(ctx, p.x, p.y, 0, {
        skin: SKIN[2], hair: C.purple, style: 'bun', top: C.mustard, bottom: C.navy, dir: 'r',
        pose: on ? 'jump' : 'stand', speed: 6.283, phase: Math.PI / 2, arms: [on ? 0.6 + strum : 0.4, 1.4],
        hold: (g) => guitar(g, C.teal, true),
      }, t);
    });

    // Musical notes pouring out of the amps and the singer
    const sources = [[5.8, 1.5, 3.4], [1.7, 5.9, 1.9], [9.0, 11.8, 0.9], [7.6, 12.2, 1.6]];
    R.air((ctx, t) => {
      if (!Q.detail || !playing(t)) return;
      const cols = [C.coral, C.navy, C.teal, C.purple, C.red];
      const n = loud(t) > 1 ? 30 : 20;
      const g = gone(t);
      particles(t, n, 2.6, (k, r, i) => {
        if (g && i % sources.length < 2) return; // (no amps, no notes from them)
        const [sx, sy, sz] = sources[i % sources.length];
        const dx = (r() - 0.5) * 2.5, dy = (r() - 0.5) * 2.5;
        const x = sx + dx * k + Math.sin(k * 8 + i) * 0.2;
        const y = sy + dy * k;
        ctx.save();
        ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.7) / 0.3);
        note(ctx, x, y, sz + k * 3.2, cols[i % cols.length], 1.1 + (loud(t) - 1));
        ctx.restore();
      }, 11);
    });

    // The mic on the milk crate: the singer has stage fright, so the band's
    // cardboard cut-out of it stands in (a decoy, mid-honk, in shades).
    const GS = { x: 10.5, y: 9.6, z: 0.72 };
    R.thing(GS.x + 0.4, GS.y + 0.4, (ctx) => {
      box(ctx, GS.x - 0.4, GS.y - 0.4, 0, 0.8, 0.8, 0.72, C.teal);
      if (Q.detail) {
        for (let i = 1; i < 4; i++) face(ctx, [[GS.x - 0.4 + i * 0.2, GS.y + 0.4, 0.1], [GS.x - 0.4 + i * 0.2, GS.y + 0.4, 0.62]], null, { lw: 0.05, stroke: shade(C.teal, 0.4) });
      }
    }, { depth: GS.x + GS.y - 0.01 });
    R.thing(GS.x, GS.y, (ctx) => {
      const [X, Y] = P(GS.x, GS.y, GS.z);
      // the strut behind it
      ctx.beginPath(); ctx.moveTo(X + 0.05, Y - 0.55); ctx.lineTo(X + 0.38, Y - 0.02);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C.woodLight; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.save();
      ctx.translate(X, Y); ctx.rotate(0.05); ctx.translate(-X, -Y);
      goose(ctx, GS.x, GS.y, GS.z, 0, { dir: 'l', pose: 'honk' });
      // the band's shades
      ctx.beginPath(); ctx.roundRect(X - 0.62, Y - 0.97, 0.2, 0.07, 0.025);
      ctx.fillStyle = C.ink; ctx.fill();
      ctx.restore();
      // the cardboard tab it stands on
      ctx.beginPath(); ctx.rect(X - 0.36, Y - 0.04, 0.72, 0.06);
      paint(ctx, C.woodLight, { lw: 0.025 });
    }, { depth: GS.x + GS.y + 0.02 });
    R.decoy({ id: 'cutout', at: [GS.x, GS.y, GS.z + 0.6], r: 0.9, say: ['Cardboard. Signs autographs.', 'Still cardboard.', 'Best member of the band.'] });
    const honking = (t) => {
      const s = sOf(t);
      if (playing(t)) return pulse(t, 1) < 0.35;
      return s > 13.2 && s < 13.8;
    };
    const lone = (t) => { const s = sOf(t); return s > 13.2 && s < 13.8; };

    // Two flight cases by the mixing desk. One is cables. The other is the
    // singer, keeping time from inside: its lid rattles on every honk.
    const CW = 1.4, CD = 1.0, CH = 0.85;
    const flightCase = (x0, y0, id, say, word, singer) => {
      const cx = x0 + CW / 2, cy = y0 + CD / 2, x1 = x0 + CW, y1 = y0 + CD;
      const pk = R.poke({ id, at: [cx, cy, CH * 0.7], r: 1.0, sound: 'clunk', say });
      const lid = (t) => {
        const k = pk.k();
        if (k > 0.01) return k * 1.9;
        if (!singer) return 0;
        // (a rattle on each honk, a big one on the lone honk)
        if (lone(t)) return 0.16 + Math.sin(t * 40) * 0.05;
        return honking(t) && playing(t) ? 0.06 : 0;
      };
      // Back: the open top, what's inside and the lid swinging up.
      R.thing(cx, cy, (ctx, t) => {
        const a = lid(t);
        if (a > 0.005) {
          face(ctx, [[x0, y0, CH], [x1, y0, CH], [x1, y1, CH], [x0, y1, CH]], C.black, { lw: 0.03 });
          if (!singer && a > 0.3 && Q.detail) {
            // a nest of cables
            ctx.beginPath();
            for (let i = 0; i <= 60; i++) {
              const q = i * 0.45, rr = 0.15 + 0.25 * Math.abs(Math.sin(i * 0.21));
              const [X, Y] = P(cx + Math.cos(q) * rr * 1.3, cy + Math.sin(q * 1.2) * rr, CH + 0.02);
              i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
            }
            ctx.strokeStyle = C.coral; ctx.lineWidth = 0.05; ctx.stroke();
          }
        }
        const yf = y0 + CD * Math.cos(a), zf = CH + CD * Math.sin(a);
        const under = a > Math.PI / 2;
        face(ctx, [[x0, y0, CH], [x1, y0, CH], [x1, yf, zf], [x0, yf, zf]], under ? C.grey : C.ink, { lw: 0.03, dots: under ? C.greyLight : C.black, density: under ? 0.4 : 0.2 });
        // the lid's aluminium edge
        face(ctx, [[x0, yf, zf], [x1, yf, zf]], null, { lw: 0.07, stroke: C.greyLight });
      }, { anim: true, depth: cx + cy - 0.5 });
      // Front: the two sides we see, with aluminium corners and a stencil.
      R.thing(cx, cy, (ctx) => {
        face(ctx, [[x1, y0, 0], [x1, y1, 0], [x1, y1, CH], [x1, y0, CH]], C.black, { lw: 0.03, dots: C.ink, density: 0.2 });
        face(ctx, [[x0, y1, 0], [x1, y1, 0], [x1, y1, CH], [x0, y1, CH]], C.ink, { lw: 0.03, dots: C.black, density: 0.2 });
        for (const pts of [[[x0, y1, 0], [x0, y1, CH]], [[x1, y1, 0], [x1, y1, CH]], [[x1, y0, 0], [x1, y0, CH]], [[x0, y1, CH], [x1, y1, CH], [x1, y0, CH]], [[x0, y1, 0.04], [x1, y1, 0.04], [x1, y0, 0.04]]]) {
          face(ctx, pts, null, { lw: 0.07, stroke: C.greyLight });
        }
        // latches
        for (const u of [0.3, CW - 0.3]) box(ctx, x0 + u - 0.07, y1, CH - 0.22, 0.14, 0.03, 0.14, C.greyLight, { lw: 0.02 });
        label(ctx, cx, y1, CH * 0.42, word, 0.2, C.mustard);
      }, { depth: cx + cy + 0.5 });
      return pk;
    };
    const CA = [9.0, 6.0], CB = [10.7, 6.0];
    const singerCase = flightCase(CA[0], CA[1], 'case', null, 'FRAGILE', true);
    flightCase(CB[0], CB[1], 'cables', ['Just cables.', 'Still just cables.', 'Do not untangle. Ever.'], 'CABLES', false);
    const SC = { x: CA[0] + CW / 2, y: CA[1] + CD / 2 };
    R.goose((t) => {
      const k = singerCase.k();
      return { x: SC.x, y: SC.y, z: 0.3, dir: 'l', pose: honking(t) ? 'honk' : 'stand', hidden: k < 0.5 };
    }, { bias: 0, kind: 'poke', inside: singerCase, hint: 'Two flight cases. One of them keeps time with the band.' });

    // mic stand in front of the cut-out
    R.thing(GS.x - 0.45, GS.y + 0.55, (ctx, t) => {
      const mx = GS.x - 0.5, my = GS.y + 0.5;
      disc(ctx, mx, my, 0.02, 0.35, C.ink, { stroke: false });
      box(ctx, mx - 0.03, my - 0.03, 0, 0.06, 0.06, 1.35, C.greyLight, { flat: true, lw: 0.03 });
      const [X, Y] = P(mx, my, 1.35);
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.roundRect(-0.07, -0.34, 0.14, 0.34, 0.05);
      paint(ctx, C.ink, { lw: 0.03 });
      ctx.beginPath();
      ctx.arc(0, -0.38, 0.11, 0, Math.PI * 2);
      paint(ctx, C.grey, { dots: C.ink, density: 0.4, lw: 0.03 });
      ctx.restore();
    }, { depth: GS.x + GS.y + 0.05 });
    // HONK! marks: from the case once it's open; before that only the lone
    // honk gets out, muffled.
    R.air((ctx, t) => {
      if (!Q.detail || !honking(t)) return;
      const open = singerCase.k() > 0.5;
      const one = !playing(t);
      if (!open && !one) return;
      const k = one ? (sOf(t) - 13.2) / 0.6 : pulse(t, 1) / 0.35;
      label(ctx, SC.x - 0.3, SC.y + 0.1, (open ? 1.9 : 1.4) + k * 0.4, one ? 'honk.' : 'HONK!', one ? (open ? 0.34 : 0.24) : 0.42, alpha(C.coral, 1 - k * 0.6));
    });
    // floor monitor wedge
    R.thing(9.2, 12.2, (ctx) => {
      face(ctx, [[8.5, 11.5, 0], [9.6, 11.5, 0], [9.6, 12.2, 0], [8.5, 12.2, 0]], C.black);
      face(ctx, [[8.5, 12.2, 0], [9.6, 12.2, 0], [9.6, 11.8, 0.6], [8.5, 11.8, 0.6]], C.ink, { dots: C.black, density: 0.3 });
      face(ctx, [[9.6, 11.5, 0], [9.6, 12.2, 0], [9.6, 11.8, 0.6], [9.6, 11.5, 0.6]], C.black);
      face(ctx, [[8.5, 11.5, 0.6], [9.6, 11.5, 0.6], [9.6, 11.8, 0.6], [8.5, 11.8, 0.6]], C.navy);
    });

    // ---------- Audience and household ----------
    // Couch fans: one headbanging, one filming
    R.mover(() => ({ x: 1.35, y: 8.0 }), (ctx, t, p) => {
      const on = playing(t);
      const [X, Y] = P(p.x, p.y, 0.8);
      ctx.save();
      if (on) { ctx.translate(X, Y); ctx.rotate(Math.max(0, Math.sin(t * 12.57)) * 0.35); ctx.translate(-X, -Y); }
      person(ctx, p.x, p.y, 0.05, folk(61, { pose: 'sit', dir: 'r', style: 'long', hair: C.ink, top: C.black, arms: on ? [Math.PI - 0.5, 0.4] : [0.6, 0.5] }), t);
      ctx.restore();
    }, { bias: 0, depth: 12.4 });
    R.mover(() => ({ x: 1.35, y: 9.6 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0.05, folk(62, { pose: 'sit', dir: 'r', style: 'pony', top: C.pink, arms: [1.9, 1.7],
        hold(g) {
          const [hx, hy] = nearHand(1.9);
          g.beginPath(); g.roundRect(hx - 0.02, hy - 0.3, 0.16, 0.28, 0.03);
          paint(g, C.ink, { lw: 0.02 });
          if (Math.floor(t * 2) % 2) { g.beginPath(); g.arc(hx + 0.06, hy - 0.25, 0.03, 0, Math.PI * 2); g.fillStyle = C.red; g.fill(); }
        } }), t);
    }, { depth: 12.45 });

    // The dog, howling along (and sulking during the telling-off)
    R.mover(() => ({ x: 7.5, y: 12.1 }), (ctx, t, p) => {
      const howl = playing(t);
      dog(ctx, p.x, p.y, 0, t, howl);
    });
    // Dog bowl by the dog, with a lost drumstick in it (a find)
    R.thing(8.5, 13.6, (ctx) => {
      cylinder(ctx, 8.3, 13.3, 0, 0.32, 0.16, C.red, { top: shade(C.red, 0.3) });
      face(ctx, [[8.0, 13.0, 0.25], [8.75, 13.95, 0.12]], null, { lw: 0.12, stroke: C.ink });
      face(ctx, [[8.0, 13.0, 0.25], [8.75, 13.95, 0.12]], null, { lw: 0.07, stroke: C.woodLight });
      if (Q.detail) label(ctx, 8.3, 13.3, 0.08, 'DOG', 0.12, C.white, 'Rethink Sans');
    });
    R.find({ id: 'drumstick', label: 'A lost drumstick', at: [8.35, 13.45, 0.2], r: 0.7 });

    // The guitar pick is on the pizza, among the pepperoni (drawn with it)
    R.find({ id: 'pick', label: 'A guitar pick', kind: 'hard', at: [PICK[0], PICK[1], 0.06], r: 0.6, riddle: 'Extra crunchy topping.', hint: 'Somebody ordered pizza. One of the toppings is not pepperoni.' });

    // Mom with a tray of juice, heading for the couch
    const mom = route([[5.0, 15.3], [2.9, 12.0], [2.7, 9.0, 3]], { speed: 0.9, loop: false, offset: 2 });
    R.mover(mom, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(70, { pose: p.moving ? 'walk' : 'carry', arms: [1.3, 1.3], dir: p.dir, back: p.back, style: 'bun', hair: C.grey, top: C.green, speed: 6,
        hold(g) {
          g.beginPath(); g.ellipse(0.35, -0.1, 0.45, 0.1, 0, 0, Math.PI * 2); paint(g, C.grey, { lw: 0.03 });
          for (const [gx, c] of [[0.1, C.coral], [0.35, C.mustard], [0.6, C.coral]]) {
            g.beginPath(); g.rect(gx - 0.06, -0.35, 0.12, 0.25); paint(g, c, { lw: 0.025 });
          }
        } }), t);
    });

    // Sound "engineer" at a folding table with a tiny mixer
    R.thing(13.8, 7.4, (ctx, t) => {
      for (const [lx, ly] of [[12.3, 6.3], [13.6, 6.3], [12.3, 7.1], [13.6, 7.1]]) box(ctx, lx, ly, 0, 0.08, 0.08, 1.05, C.grey, { flat: true, lw: 0.03 });
      box(ctx, 12.2, 6.2, 1.05, 1.6, 1.1, 0.08, C.greyLight);
      box(ctx, 12.4, 6.35, 1.13, 1.2, 0.8, 0.15, C.ink, { top: C.navy });
      if (Q.detail) {
        for (let i = 0; i < 6; i++) {
          const lev = playing(t) ? (Math.sin(t * 9 + i * 1.7) + 1) / 2 : 0.1;
          const x = 12.5 + i * 0.18;
          face(ctx, [[x, 6.45, 1.29], [x, 7.05, 1.29]], null, { lw: 0.03, stroke: C.grey });
          const [X, Y] = P(x, 6.45 + 0.6 * (1 - lev), 1.29);
          ctx.beginPath(); ctx.rect(X - 0.05, Y - 0.04, 0.1, 0.08); ctx.fillStyle = i % 2 ? C.coral : C.mustard; ctx.fill();
        }
        // VU meters
        const lv = playing(t) ? 0.4 + kick(t) * 0.6 * (loud(t) / 1.5) : 0.05;
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 6; i++) {
            const [X, Y] = P(12.45 + j * 0.1, 6.4, 1.3 + i * 0.1);
            ctx.beginPath(); ctx.rect(X - 0.05, Y - 0.05, 0.08, 0.07);
            ctx.fillStyle = i / 6 < lv ? (i > 3 ? C.red : C.leaf) : C.ink;
            ctx.fill();
          }
        }
      }
    }, { anim: true });
    R.mover(() => ({ x: 14.6, y: 6.9 }), (ctx, t, p) => {
      const on = playing(t);
      const nod = on ? Math.abs(Math.sin(t * 6.283)) * 0.08 : 0;
      ctx.save();
      ctx.translate(0, nod);
      person(ctx, p.x, p.y, 0, folk(71, { pose: 'stand', dir: 'l', style: 'bald', top: C.navy, arms: [1.25 + Math.sin(t * 3) * 0.08, 1.35] }), t);
      // big headphones
      const [X, Y] = P(p.x, p.y, 0);
      ctx.beginPath(); ctx.arc(X - 0.02, Y - 1.95, 0.36, Math.PI * 1.05, Math.PI * 1.95);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(X - 0.1, Y - 1.92, 0.12, 0.16, 0, 0, Math.PI * 2); paint(ctx, C.coral, { lw: 0.03 });
      ctx.restore();
    });

    // Little brother clanging pot lids, right next to someone asleep
    R.thing(14.3, 13.0, (ctx) => {
      // beanbag
      const [X, Y] = P(14.0, 12.7, 0);
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.35, 1.2, 0.55, 0, 0, Math.PI * 2);
      paint(ctx, C.coral, { dots: shade(C.coral, 0.4), density: 0.22 });
    }, { depth: 26.4 });
    R.mover(() => ({ x: 13.9, y: 12.9 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0.55, folk(72, { pose: 'sleep', dir: 'l', top: C.sky, style: 'curly', hair: C.brown }), t);
      // tambourine rising and falling on their belly
      const b = Math.sin(t * 1.4) * 0.05;
      const [X, Y] = P(p.x, p.y, 0.55);
      ctx.save();
      ctx.translate(X + 0.35, Y - 0.62 - b);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.13, 0, 0, Math.PI * 2);
      paint(ctx, C.woodLight, { lw: 0.04 });
      ctx.beginPath(); ctx.ellipse(0, -0.02, 0.22, 0.08, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.white; ctx.fill();
      if (Q.detail) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath(); ctx.arc(Math.cos(a) * 0.28, Math.sin(a) * 0.12, 0.045, 0, Math.PI * 2);
          ctx.fillStyle = C.mustard; ctx.fill();
        }
      }
      ctx.restore();
    }, { bias: 0.5 });
    R.find({ id: 'tambourine', label: 'A tambourine', at: (t) => [13.9 + 0.45, 12.9 + 0.1, 0.55 + 0.55], r: 0.7 });
    R.mover(() => ({ x: 12.5, y: 12.5 }), (ctx, t, p) => {
      const on = playing(t);
      const up = on ? Math.sin(t * 12.57) : 0;
      const aA = Math.PI - 0.6 + up * 0.35, aB = -Math.PI + 0.6 + up * 0.35;
      person(ctx, p.x, p.y, 0, folk(73, { pose: 'stand', scale: 0.7, dir: 'r', top: C.mustard, hat: 'beanie', arms: [aA, aB],
        hold(g) {
          const lid = (hx, hy) => {
            g.beginPath(); g.ellipse(hx, hy, 0.3, 0.1, 0, 0, Math.PI * 2);
            paint(g, C.grey, { lw: 0.035, dots: C.white, density: 0.3 });
            g.beginPath(); g.arc(hx, hy - 0.1, 0.05, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill();
          };
          lid(...nearHand(aA));
          lid(...farHand(aB));
        } }), t);
    });

    // A kid at the front with ear defenders, reading a comic, unbothered
    R.mover(() => ({ x: 11.2, y: 15.0 }), (ctx, t, p) => {
      box(ctx, p.x - 0.35, p.y - 0.35, 0, 0.7, 0.7, 0.45, C.mustard);
      person(ctx, p.x, p.y, -0.2, folk(74, { pose: 'sit', scale: 0.72, dir: 'l', top: C.coral, style: 'short', arms: [1.2, 1.1],
        hold(g) {
          g.beginPath(); g.rect(0.1, -0.35, 0.38, 0.32); paint(g, C.sky, { lw: 0.03 });
          g.beginPath(); g.rect(0.14, -0.3, 0.14, 0.12); g.fillStyle = C.coral; g.fill();
        } }), t);
      const [X, Y] = P(p.x, p.y, -0.2);
      const s = 0.72;
      ctx.beginPath(); ctx.arc(X - 0.02 * s, Y - 1.95 * s + 0.0, 0.34 * s, Math.PI * 1.05, Math.PI * 1.95);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke();
      for (const dx of [-0.26, 0.24]) {
        ctx.beginPath(); ctx.ellipse(X + dx * s, Y - 1.9 * s, 0.1, 0.14, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
      }
    });

    // Roadie sitting in the Great Knot, trying to find the end
    R.mover(() => ({ x: 7.9, y: 8.7 }), (ctx, t, p) => {
      const tug = Math.max(0, Math.sin(t * 1.3)) ** 4;
      const aA = 1.3 + tug * 1.2, aB = 1.1;
      person(ctx, p.x, p.y, -0.45, folk(75, { pose: 'sit', dir: 'l', top: C.greyLight, hat: 'cap', arms: [aA, aB],
        hold(g) {
          const [hx, hy] = nearHand(aA);
          g.beginPath();
          g.moveTo(hx, hy);
          g.bezierCurveTo(hx + 0.4, hy + 0.3, hx - 0.2, hy + 0.9, hx + 0.3, hy + 1.2);
          g.strokeStyle = C.black; g.lineWidth = 0.06; g.stroke();
          g.beginPath(); g.ellipse(hx + 0.05, hy + 0.2, 0.18, 0.12, 0.4, 0, Math.PI * 2);
          g.strokeStyle = C.black; g.lineWidth = 0.05; g.stroke();
        } }), t);
    }, { bias: 0.3 });

    // Merch table by the garage door: many T-shirts, zero customers
    R.thing(13.3, 3.5, (ctx) => {
      table(ctx, 11.2, 2.5, 2.1, 1.0, 1.0, C.greyLight);
      const shirt = (x, y, c) => {
        const [X, Y] = P(x, y, 1.02);
        ctx.beginPath();
        ctx.moveTo(X - 0.25, Y - 0.1); ctx.lineTo(X - 0.1, Y - 0.2); ctx.lineTo(X + 0.1, Y - 0.2); ctx.lineTo(X + 0.25, Y - 0.1);
        ctx.lineTo(X + 0.18, Y + 0.0); ctx.lineTo(X + 0.12, Y - 0.02); ctx.lineTo(X + 0.12, Y + 0.18); ctx.lineTo(X - 0.12, Y + 0.18); ctx.lineTo(X - 0.12, Y - 0.02); ctx.lineTo(X - 0.18, Y + 0.0);
        ctx.closePath();
        paint(ctx, c, { lw: 0.03 });
      };
      shirt(11.6, 2.9, C.coral); shirt(12.2, 2.9, C.black); shirt(12.8, 2.9, C.mustard);
      shirt(11.9, 3.25, C.teal); shirt(12.5, 3.25, C.coral);
      // cash tin
      box(ctx, 12.9, 3.1, 1.0, 0.35, 0.3, 0.14, C.green);
      // sign on the front
      face(ctx, [[11.5, 3.52, 0.35], [12.9, 3.52, 0.35], [12.9, 3.52, 0.8], [11.5, 3.52, 0.8]], C.white);
      label(ctx, 12.2, 3.52, 0.58, 'MERCH $5', 0.26, C.coral);
    });
    R.mover(() => ({ x: 12.3, y: 2.0 }), (ctx, t, p) => {
      const pitch = pulse(t, 7) < 0.3;
      person(ctx, p.x, p.y, 0, folk(76, { pose: pitch ? 'wave' : 'stand', dir: 'l', style: 'pony', top: C.coral, arms: pitch ? undefined : [0.9, 0.9] }), t);
    });

    // Spare guitar leaning on a stand
    R.thing(10.3, 1.9, (ctx) => {
      const [X, Y] = P(10.1, 1.6, 0);
      ctx.beginPath(); ctx.moveTo(X - 0.3, Y); ctx.lineTo(X, Y - 0.5); ctx.lineTo(X + 0.3, Y);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke();
      ctx.save(); ctx.translate(X, Y - 0.35); ctx.rotate(-Math.PI / 2 + 0.15);
      ctx.beginPath(); ctx.rect(0.2, -0.045, 1.1, 0.09); paint(ctx, C.brown, { lw: 0.03 });
      ctx.beginPath(); ctx.ellipse(0, 0, 0.32, 0.25, 0, 0, Math.PI * 2); ctx.ellipse(0.28, 0, 0.22, 0.18, 0, 0, Math.PI * 2);
      paint(ctx, C.sky, { lw: 0.04, dots: shade(C.sky, 0.4), density: 0.15 });
      ctx.restore();
    });

    // Garage leftovers along the parking line: tires and boxes
    R.thing(15.3, 15.3, (ctx) => {
      for (let i = 0; i < 3; i++) {
        cylinder(ctx, 14.7, 14.7, i * 0.32, 0.6, 0.3, C.black, { top: C.ink });
        disc(ctx, 14.7, 14.7, i * 0.32 + 0.31, 0.28, C.greyLight, { lw: 0.03 });
      }
    });
    R.thing(15.6, 10.8, (ctx) => {
      box(ctx, 14.3, 9.3, 0, 1.3, 1.1, 0.8, C.woodLight, { top: tint(C.woodLight, 0.2) });
      box(ctx, 14.45, 9.45, 0.8, 1.0, 0.9, 0.6, C.wood, { top: C.woodLight });
      box(ctx, 14.6, 9.6, 1.4, 0.8, 0.7, 0.45, C.woodLight, { top: tint(C.woodLight, 0.2) });
      label(ctx, 14.95, 10.4, 0.4, 'XMAS', 0.22, C.red);
      label(ctx, 15.45, 10.05, 1.1, 'MISC', 0.2, C.navy);
      // a string of tinsel escaping the top box
      face(ctx, [[14.9, 9.9, 1.86], [15.3, 10.5, 1.2], [15.1, 10.4, 0.7]], null, { lw: 0.05, stroke: C.pink });
    });

    // Superfan with a homemade sign, bouncing
    R.mover(() => ({ x: 10.7, y: 13.5 }), (ctx, t, p) => {
      const on = playing(t);
      person(ctx, p.x, p.y, 0, folk(77, { pose: on ? 'jump' : 'stand', speed: 6.283, dir: 'r', style: 'curly', hair: C.red, top: C.white, arms: [Math.PI - 0.15, -Math.PI + 0.35],
        hold(g) {
          const [hx, hy] = nearHand(Math.PI - 0.15);
          g.beginPath(); g.moveTo(hx, hy + 0.1); g.lineTo(hx, hy - 0.35); g.strokeStyle = C.brown; g.lineWidth = 0.06; g.stroke();
          g.beginPath(); g.rect(hx - 0.75, hy - 0.95, 1.5, 0.62); paint(g, C.butter, { lw: 0.04 });
          g.save(); g.translate(hx, hy - 0.64); g.scale(1 / 40, 1 / 40);
          g.font = '9px "Bagel Fat One", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.coral;
          g.fillText('HONK IF U', 0, -5); g.fillText('LUV US', 0, 6);
          g.restore();
        } }), t);
    });

    // ---------- Words in the air ----------
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const s = sOf(t);
      if (s > 11.3 && s < 14.3) speech(ctx, 0.75 + Math.sin(t * 40) * 0.03, 12.2, 3.2, 'KEEP IT DOWN!', { size: 0.5, fill: C.butter });
      if (s > 14.6 && s < 15.3) label(ctx, 1.2, 11.9, 3.7 + (s - 14.6) * 0.5, 'SLAM!', 0.5, C.coral);
      if (s > 15.3 && s < 16.5) speech(ctx, KX - 1.3, KY - 1.3, 3.1, '1, 2, 3, 4!', { size: 0.45 });
      if (playing(t) && pulse(t, 3) < 0.5) label(ctx, 7.8, 11.7, 1.9 + pulse(t, 3) * 1.2, 'AWOOO', 0.3, C.brown);
      if (playing(t) && Math.sin(t * 12.57) > 0.8) label(ctx, 13.1, 12.1, 2.0, 'CLANG!', 0.3, C.navy);
      if (s > 12.2 && s < 14.2) label(ctx, 7.4, 8.4, 2.0, '...', 0.4, C.ink);
    });
  },
};
