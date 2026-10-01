// The Refuge Dunes: the Parker River refuge behind its beach
// (docs/levels/plum.md). The refuge road, Lot 1 and its boardwalk over the
// dunes, Hellcat's boardwalk along the marsh edge out to the observation
// tower, full of birders (and Inspector Pidge with a borrowed scope), a deer
// in the scrub, greenhead traps along the marsh edge. At the north end, the
// gatehouse: the ranger unhooks the chain at 7:40, the lots fill by
// mid-morning, the ranger hangs "REFUGE FULL", and the line of cars waits all
// day (day.js). Bikes sail past it. Every scope on the tower swings toward a
// rare bird; it's the goose; by the time they've focused, it's somewhere else.
//
// World units, like land.js.
import { C, Q, P, folk, box, disc, face, paint, paintText, speech, mix, tint, shade, alpha } from '../../../engine/art.js';
import { schedule, route, particles, ease, clamp } from '../../../engine/actors.js';
import { drawLand } from '../../../engine/terrain.js';
import { land, h, LOTS, GATE, BLVD, TRACK, lineDist } from '../land.js';
import { LOOP, at, hour, nightK, sunsetWatch } from '../tide.js';
import { EVENING, INK, LAND, CARS, BRAND, LIT, lightsOn } from '../style.js';
import { who, trap, car, board, footing, nightGlow, printed } from '../kit.js';
import { aside } from '../swarm.js';
import { walkers } from '../day.js';

const TAU = Math.PI * 2;
const [, M0, , M1] = LOTS.lot1;
const WALK = 40; // Lot 1's boardwalk, along y, from the lot over the dunes to the beach
const TOWER = [18.6, 28.4]; // the observation tower's back corner, at the end of Hellcat's boardwalk

// ---------- Inks ----------
const DECK = mix(C.woodLight, INK.shingle, 0.35); // boardwalk gone silver in the salt
const POST = shade(mix(C.wood, INK.shingle, 0.3), 0.2);
const DECK0 = DECK, POST0 = POST;
const SIGN = mix(C.brown, C.ink, 0.3); // the refuge's brown signs
const KHAKI = mix(C.woodLight, C.green, 0.25); // birders' vests
const RANGER = mix(C.green, C.ink, 0.2);
const HAT = mix(C.brown, C.woodLight, 0.35);
const DEER = mix(C.wood, C.brown, 0.4);
const COAT = mix(C.wood, C.greyLight, 0.45); // Pidge's trench coat
const BUSH = [shade(LAND.scrub, 0.28), shade(mix(LAND.scrub, C.green, 0.5), 0.12), shade(mix(LAND.scrub, LAND.dune, 0.3), 0.2)];

// ---------- The goose, and the scopes one step behind it ----------
// It stands at each hiding place in the dunes a while (honking as it gets
// there), then walks to the next. The scopes swing to where it honked two
// and a half seconds later, and stay there after it's gone.
const HIDES = [[22.5, 39.6], [28.5, 38.6], [33, 40.2], [25.5, 37.8]];
const SLOT = 9, GOOSE_SPEED = 1.8;
const wrapN = (k, n) => ((k % n) + n) % n;
function gooseAt(t) {
  const n = HIDES.length, k = Math.floor(t / SLOT), local = t - k * SLOT;
  const [ax, ay] = HIDES[wrapN(k, n)], [bx, by] = HIDES[wrapN(k + 1, n)];
  const walk = Math.hypot(bx - ax, by - ay) / GOOSE_SPEED, stay = SLOT - walk;
  if (local < stay) return { x: ax, y: ay, moving: false, local };
  const e = (local - stay) / walk;
  return { x: ax + (bx - ax) * e, y: ay + (by - ay) * e, moving: true, dir: (bx - ax) - (by - ay) >= 0 ? 'r' : 'l', local };
}
const LAG = 2.5;
function aimAt(t) {
  const s = t - LAG, k = Math.floor(s / SLOT), local = s - k * SLOT, n = HIDES.length;
  const cur = HIDES[wrapN(k, n)], prev = HIDES[wrapN(k - 1, n)], e = ease(clamp(local / 1.1));
  return { x: prev[0] + (cur[0] - prev[0]) * e, y: prev[1] + (cur[1] - prev[1]) * e, local, k };
}

// ---------- The gate's day ----------
const full = (t) => { const hr = hour(t); return hr >= 9.42 && hr < 17.2; };
const closed = (t) => { const hr = hour(t); return hr >= 21.15 || hr < 7.6; };
const open = (t) => !full(t) && !closed(t);
const trier = walkers.find((w) => w.id === 'trier');
const trierAtGate = (t) => { if (!trier) return false; const p = trier.at(t); return !p.moving && p.x < GATE + 2.4 && p.y < BLVD; };

// The refuge road's middle at x (the gravel track), for the bikes, worked out once.
const TY = [];
for (let i = 0; i <= 100; i++) {
  const x = i / 2;
  let best = BLVD, d = Infinity;
  for (let y = 29; y < 36; y += 0.1) { const e = lineDist(x, y, TRACK); if (e < d) { d = e; best = y; } }
  TY.push(best);
}
const trackY = (x) => { const u = clamp(x * 2, 0, 99.999), i = Math.floor(u); return TY[i] + (TY[i + 1] - TY[i]) * (u - i); };

// ---------- Small helpers ----------
const line = (ctx, a, b) => { const [x0, y0] = P(...a), [x1, y1] = P(...b); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); };
const say = (ctx, x, y, z, text, dx = 0) => { if (Q.detail) speech(ctx, x, y, z, text, { size: 0.42, dx }); };
// Lettering on an upright board's plane, a line or several, centred on (x, y, z).
function letters(ctx, along, x, y, z, lines, size, ink = C.white) {
  if (!Q.detail) return;
  ctx.save();
  const [dx, dy] = along === 'x' ? P(0, y, 0) : P(x, 0, 0);
  ctx.translate(dx, dy);
  const n = lines.length;
  lines.forEach((s, i) => paintText(ctx, along === 'x' ? 'right' : 'left', along === 'x' ? x : y, z + ((n - 1) / 2 - i) * size * 1.3, s, size, ink, 'Rethink Sans'));
  ctx.restore();
}
// A sign on two posts with a few lines on it. o: { along, w, h, post, board, ink, size }
function sign(R, x, y, lines, o = {}) {
  const along = o.along || 'x', size = o.size || 0.24, post = o.post || 1.3;
  const w = o.w || Math.max(1.2, Math.max(...lines.map((s) => s.length)) * size * 0.6 + 0.35), bh = o.h || size * 1.3 * lines.length + 0.2;
  const z = footing(R, x, y);
  R.thing(x + 0.1, y + 0.1, (ctx) => {
    for (const s of [-1, 1]) {
      const off = s * (w / 2 - 0.2), [px, py] = along === 'x' ? [x + off, y] : [x, y + off];
      box(ctx, px - 0.05, py - 0.05, z, 0.1, 0.1, post + bh / 2, POST, { flat: true, lw: 0.03 });
    }
    const bx = x + (along === 'y' ? 0.06 : 0), by = y + (along === 'x' ? 0.06 : 0);
    board(ctx, along, bx, by, z + post, w, bh, null, { board: o.board || SIGN });
    letters(ctx, along, bx, by, z + post, lines, size, o.ink || C.white);
  });
}
// A clump of scrub (bayberry, beach plum): a few rounded blobs, back first.
function bush(ctx, x, y, z, r, col) {
  const [X, Y] = P(x, y, z);
  for (const [dx, dy, k] of [[-0.45, -0.55, 0.7], [0.4, -0.6, 0.75], [0, -0.85, 0.8], [-0.2, -0.35, 0.6], [0.3, -0.3, 0.6]]) {
    ctx.beginPath();
    ctx.ellipse(X + dx * r, Y + dy * r, r * k, r * k * 0.78, 0, 0, TAU);
    paint(ctx, dy > -0.5 ? tint(col, 0.08) : col, { lw: 0.04, dots: Q.detail && dy < -0.7 ? shade(col, 0.4) : null, density: 0.15 });
  }
}
// A pitch pine at Sandy Point: a leaning trunk and dark clouds of needles.
function pine(ctx, x, y, z, s) {
  box(ctx, x - 0.1, y - 0.1, z, 0.2, 0.2, 1.6 * s, shade(C.brown, 0.1), { flat: true, lw: 0.035 });
  const [X, Y] = P(x, y, z);
  const green = mix(C.green, C.ink, 0.28);
  for (const [dx, dy, r] of [[-0.5, -2.0, 0.65], [0.45, -2.2, 0.6], [0, -2.7, 0.7], [-0.2, -3.25, 0.5], [0.35, -1.6, 0.45]]) {
    ctx.beginPath();
    ctx.ellipse(X + dx * s, Y + dy * s, r * s, r * s * 0.7, 0, 0, TAU);
    paint(ctx, dy > -2.1 ? green : tint(green, 0.1), { lw: 0.04, dots: Q.detail ? shade(green, 0.5) : null, density: 0.18 });
  }
}

// A boardwalk: sections a unit long from u0 to u1 along x or y, v0 to v1
// across, its deck at zAt(u), with a rail each side unless o.rails is false.
const RAIL = 0.95;
function walkway(R, along, u0, u1, v0, v1, zAt, o = {}) {
  const W = along === 'x' ? (u, v, z) => [u, v, z] : (u, v, z) => [v, u, z];
  const g = (u, v) => { const [x, y] = W(u, v, 0); return h(x, y); };
  for (let a = u0; a < u1 - 1e-6; a += 1) {
    const b = Math.min(u1, a + 1), za = zAt(a), zb = zAt(b);
    const zu = (u) => za + ((zb - za) * (u - a)) / (b - a || 1);
    const [fx, fy] = W(b, v1, 0);
    R.thing(fx, fy, (ctx) => {
      const rail = (v) => {
        if (o.rails === false) return;
        for (const u of a === u0 ? [a + 0.05, b - 0.05] : [b - 0.05]) {
          const [x, y] = W(u, v, 0);
          box(ctx, x - 0.045, y - 0.045, zu(u), 0.09, 0.09, RAIL, POST, { flat: true, lw: 0.025 });
        }
        ctx.beginPath();
        line(ctx, W(a, v, za + RAIL), W(b, v, zb + RAIL));
        if (Q.detail) line(ctx, W(a, v, za + RAIL * 0.5), W(b, v, zb + RAIL * 0.5));
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
        ctx.strokeStyle = DECK; ctx.lineWidth = 0.05; ctx.stroke();
      };
      rail(v0 + 0.05);
      // Pilings under its front corners, down into the sand.
      for (const v of [v0 + 0.1, v1 - 0.1]) {
        const [x, y] = W(b - 0.1, v, 0), gz = g(b - 0.1, v) - 0.1;
        if (zb - gz > 0.2) box(ctx, x - 0.05, y - 0.05, gz, 0.1, 0.1, zb - gz - 0.1, POST, { flat: true, lw: 0.025 });
      }
      face(ctx, [W(a, v1, za), W(b, v1, zb), W(b, v1, zb - 0.13), W(a, v1, za - 0.13)], shade(DECK, 0.28), { lw: 0.035 });
      face(ctx, [W(b, v0, zb), W(b, v1, zb), W(b, v1, zb - 0.13), W(b, v0, zb - 0.13)], shade(DECK, 0.14), { lw: 0.035 });
      face(ctx, [W(a, v0, za), W(b, v0, zb), W(b, v1, zb), W(a, v1, za)], DECK, { lw: 0.04 });
      if (Q.detail) {
        ctx.beginPath();
        for (let u = a + 0.25; u < b - 0.05; u += 0.25) line(ctx, W(u, v0, zu(u)), W(u, v1, zu(u)));
        ctx.strokeStyle = alpha(shade(DECK, 0.4), 0.7); ctx.lineWidth = 0.025; ctx.stroke();
      }
      rail(v1 - 0.05);
    });
  }
}

// ---------- People's kit ----------
// A khaki vest with pockets, open down the front.
function vest(ctx, b) {
  for (const [x0, x1] of [[-0.3, -0.05], [0.05, 0.3]]) {
    ctx.beginPath();
    ctx.rect(x0, b.top + 0.06, x1 - x0, b.hipY - b.top + 0.02);
    paint(ctx, KHAKI, { lw: 0.03 });
  }
  if (Q.detail && !b.back) {
    ctx.fillStyle = shade(KHAKI, 0.3);
    ctx.fillRect(-0.26, b.top + 0.42, 0.16, 0.14);
    ctx.fillRect(0.1, b.top + 0.42, 0.16, 0.14);
  }
}
// Binoculars up to the eyes.
function binocs(ctx, hy, back) {
  if (back) return;
  ctx.beginPath();
  ctx.roundRect(0.14, hy - 0.08, 0.32, 0.16, 0.05);
  paint(ctx, C.black, { lw: 0.03 });
}
// Where a hand is, for an arm at angle a (person units, facing right).
const hand = (hy, a) => [0.22 + Math.sin(a) * 0.72, hy + 0.42 + Math.cos(a) * 0.72];
// The ranger's flat hat, a badge, and whatever's in hand (a coffee, a book).
function rangerLook(arms, held) {
  return {
    ...RANGER_BASE,
    arms,
    wear(ctx, b) {
      if (!Q.detail || b.back) return;
      ctx.beginPath();
      ctx.arc(0.12, b.shoulderY + 0.22, 0.07, 0, TAU);
      paint(ctx, C.mustard, { lw: 0.02 });
    },
    face(ctx, hy) {
      ctx.beginPath();
      ctx.ellipse(0.02, hy - 0.2, 0.5, 0.1, 0, 0, TAU);
      paint(ctx, HAT, { lw: 0.04 });
      ctx.beginPath();
      ctx.moveTo(-0.24, hy - 0.22); ctx.lineTo(-0.16, hy - 0.58); ctx.lineTo(0.02, hy - 0.5); ctx.lineTo(0.2, hy - 0.58); ctx.lineTo(0.28, hy - 0.22);
      ctx.closePath();
      paint(ctx, HAT, { lw: 0.04 });
      if (!held || !arms) return;
      const [x, y] = hand(hy, arms[0]);
      ctx.beginPath();
      if (held === 'cup') ctx.rect(x - 0.08, y - 0.2, 0.16, 0.2);
      else ctx.rect(x - 0.02, y - 0.24, 0.3, 0.22);
      paint(ctx, held === 'cup' ? C.white : C.coral, { lw: 0.03 });
    },
  };
}
const RANGER_BASE = folk(171, { top: RANGER, bottom: C.brown, style: 'short', hair: shade(C.brown, 0.4) });
// Inspector Pidge: trench coat and deerstalker, a borrowed scope.
const pidgeLook = folk(19, {
  top: COAT, bottom: shade(COAT, 0.3),
  wear(ctx, b) {
    ctx.beginPath();
    ctx.moveTo(-0.3, b.hipY - 0.12); ctx.lineTo(0.3, b.hipY - 0.12); ctx.lineTo(0.4, b.hipY + 0.46); ctx.lineTo(-0.4, b.hipY + 0.46);
    ctx.closePath();
    paint(ctx, COAT, { lw: 0.04 });
    ctx.fillStyle = shade(COAT, 0.45);
    ctx.fillRect(-0.29, b.hipY - 0.16, 0.58, 0.08);
  },
  face(ctx, hy) {
    const check = mix(C.greyLight, C.brown, 0.45);
    for (const s of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(0.02 + s * 0.26, hy - 0.14);
      ctx.quadraticCurveTo(0.02 + s * 0.5, hy - 0.12, 0.02 + s * 0.58, hy + 0.04);
      ctx.lineTo(0.02 + s * 0.24, hy - 0.04);
      ctx.closePath();
      paint(ctx, shade(check, 0.15), { lw: 0.04 });
    }
    ctx.beginPath();
    ctx.arc(0.02, hy - 0.06, 0.33, Math.PI, 0);
    ctx.closePath();
    paint(ctx, check, { dots: Q.detail ? C.ink : null, density: 0.3, lw: 0.05 });
  },
});
// A spotting scope on its tripod, at (x, y) on a deck at z, aimed along (ux, uy).
function scope(ctx, x, y, z, ux, uy, color) {
  const pz = z + 1.5;
  ctx.beginPath();
  for (const [fx, fy] of [[-0.28, -0.18], [0.3, -0.12], [0.02, 0.32]]) line(ctx, [x, y, pz], [x + fx, y + fy, z]);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
  const a = P(x - ux * 0.35, y - uy * 0.35, pz + 0.06), b = P(x + ux * 0.55, y + uy * 0.55, pz - 0.05);
  ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.24; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 0.14; ctx.stroke();
  ctx.beginPath(); ctx.arc(b[0], b[1], 0.1, 0, TAU);
  paint(ctx, C.ink, { lw: 0.02 });
}

// A bike and its rider, along x at (x, y, z), heading dir (+1 toward +x).
function bike(ctx, x, y, z, dir, color, look, t, scale = 1) {
  const r = 0.36 * scale, sp = 0.52 * scale, spin = t * 6 * dir;
  const wheel = (cx) => {
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * TAU, [X, Y] = P(cx + Math.cos(a) * r, y, z + r + Math.sin(a) * r); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
    if (!Q.detail) return;
    ctx.beginPath();
    for (let k = 0; k < 2; k++) { const a = spin + k * Math.PI / 2; line(ctx, [cx + Math.cos(a) * r, y, z + r + Math.sin(a) * r], [cx - Math.cos(a) * r, y, z + r - Math.sin(a) * r]); }
    ctx.lineWidth = 0.025; ctx.stroke();
  };
  wheel(x - sp); wheel(x + sp);
  const seat = [x - 0.12 * dir * scale, y, z + r + 0.55 * scale], bars = [x + sp * 0.8 * dir, y, z + r + 0.62 * scale];
  ctx.beginPath();
  line(ctx, [x - sp, y, z + r], seat); line(ctx, seat, [x + 0.05 * dir, y, z + r]); line(ctx, [x + 0.05 * dir, y, z + r], [x - sp, y, z + r]);
  line(ctx, seat, bars); line(ctx, bars, [x + sp, y, z + r]); line(ctx, [x + 0.05 * dir, y, z + r], bars);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 0.07; ctx.stroke();
  who(ctx, seat[0], y, seat[2] - 0.8 * scale, look, null, { pose: 'sit', dir: dir > 0 ? 'r' : 'l', scale }, t);
}

// A white-tailed deer, side on, ears up, half in the grass; the tail flicks.
function deer(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(-1.3, 1.3); // facing the Sound's end of the island
  const leg = (x0, x1) => { ctx.moveTo(x0, -0.95); ctx.lineTo(x1, -0.45); ctx.lineTo(x1 - 0.02, 0); };
  ctx.beginPath(); leg(-0.42, -0.46); leg(-0.26, -0.28); leg(0.32, 0.34); leg(0.46, 0.5);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.15; ctx.stroke();
  ctx.strokeStyle = DEER; ctx.lineWidth = 0.08; ctx.stroke();
  // Tail: down and brown, then up and white for a moment.
  const f = (((t + 1.3) % 5.5) + 5.5) % 5.5, up = f < 0.7 ? Math.sin((f / 0.7) * Math.PI) : 0;
  ctx.save();
  ctx.translate(-0.6, -1.12);
  ctx.rotate(-0.6 - up * 1.6);
  ctx.beginPath(); ctx.ellipse(-0.14, 0, 0.17, 0.08 + up * 0.04, 0, 0, TAU);
  paint(ctx, up > 0.3 ? C.white : DEER, { lw: 0.035 });
  ctx.restore();
  // Body, belly, neck and head.
  ctx.beginPath(); ctx.ellipse(0, -1.05, 0.64, 0.3, -0.05, 0, TAU);
  paint(ctx, DEER, { lw: 0.045, dots: Q.detail ? shade(DEER, 0.45) : null, density: 0.12 });
  ctx.beginPath(); ctx.ellipse(0.04, -0.84, 0.4, 0.08, 0, 0, TAU);
  ctx.fillStyle = tint(DEER, 0.6); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.34, -1.2); ctx.lineTo(0.56, -1.82); ctx.lineTo(0.76, -1.76); ctx.lineTo(0.62, -1.05);
  ctx.closePath();
  paint(ctx, DEER, { lw: 0.045 });
  const twitch = Math.sin(t * 3) > 0.92 ? 0.25 : 0;
  for (const [ex, a] of [[0.6, -0.35 - twitch], [0.74, 0.25]]) {
    ctx.save(); ctx.translate(ex, -1.98); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.07, 0.17, 0, 0, TAU);
    paint(ctx, DEER, { lw: 0.03 });
    ctx.restore();
  }
  ctx.beginPath();
  ctx.ellipse(0.72, -1.84, 0.19, 0.13, 0.35, 0, TAU);
  ctx.moveTo(0.8, -1.9); ctx.lineTo(1.0, -1.76); ctx.lineTo(0.84, -1.7);
  paint(ctx, DEER, { lw: 0.045 });
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(0.99, -1.77, 0.04, 0, TAU); ctx.arc(0.74, -1.88, 0.03, 0, TAU); ctx.fill();
  if (Q.detail) { ctx.fillStyle = C.white; ctx.beginPath(); ctx.ellipse(0.6, -1.5, 0.07, 0.12, 0.3, 0, TAU); ctx.fill(); }
  // The grass in front of it, up to its belly.
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const gx = -0.85 + i * 0.12, hgt = 0.45 + ((i * 7) % 5) * 0.08, lean = Math.sin(t * 1.4 + i) * 0.05 + (i % 2 ? 0.08 : -0.06);
    ctx.moveTo(gx, 0.02); ctx.quadraticCurveTo(gx + lean * 0.5, -hgt * 0.5, gx + lean, -hgt);
  }
  ctx.strokeStyle = shade(LAND.dune, 0.35); ctx.lineWidth = 0.07; ctx.stroke();
  ctx.strokeStyle = tint(LAND.dune, 0.1); ctx.lineWidth = 0.035; ctx.stroke();
  ctx.restore();
}

// A snowy egret stalking the back shore; now and then it strikes.
function egret(ctx, x, y, z, t, dir) {
  const [X, Y] = P(x, y, z);
  const strike = (((t % 7) + 7) % 7) > 6.2;
  ctx.save(); ctx.translate(X, Y); ctx.scale(dir === 'l' ? -1 : 1, 1);
  ctx.beginPath(); ctx.moveTo(-0.05, -0.6); ctx.lineTo(-0.08, 0); ctx.moveTo(0.06, -0.6); ctx.lineTo(0.1, 0);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.72, 0.3, 0.13, -0.2, 0, TAU);
  ctx.moveTo(-0.22, -0.7); ctx.lineTo(-0.44, -0.62); ctx.lineTo(-0.2, -0.62);
  paint(ctx, C.white, { lw: 0.035 });
  const hx = strike ? 0.55 : 0.2, hy = strike ? -0.55 : -1.3;
  ctx.beginPath(); ctx.moveTo(0.2, -0.78); ctx.quadraticCurveTo(strike ? 0.4 : 0.05, -1.05, hx, hy);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.07; ctx.stroke();
  ctx.beginPath(); ctx.arc(hx, hy, 0.07, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(hx + 0.05, hy - 0.02); ctx.lineTo(hx + 0.3, hy + (strike ? 0.12 : 0.02)); ctx.lineTo(hx + 0.05, hy + 0.03);
  paint(ctx, C.ink, { lw: 0.02 });
  ctx.restore();
}

// A cottontail, a hop at a time.
function rabbit(ctx, x, y, z, dir) {
  const [X, Y] = P(x, y, z);
  const fur = mix(C.brown, C.greyLight, 0.35);
  ctx.save(); ctx.translate(X, Y); ctx.scale(dir === 'l' ? -1 : 1, 1);
  ctx.beginPath(); ctx.ellipse(0, -0.2, 0.24, 0.17, 0, 0, TAU); paint(ctx, fur, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(-0.24, -0.24, 0.07, 0, TAU); paint(ctx, C.white, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0.2, -0.34, 0.11, 0, TAU); paint(ctx, fur, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0.14, -0.55, 0.04, 0.13, -0.2, 0, TAU); ctx.ellipse(0.22, -0.55, 0.04, 0.13, 0.2, 0, TAU); paint(ctx, fur, { lw: 0.025 });
  ctx.restore();
}

export default {
  id: 'refuge-dunes',
  name: 'The Refuge Dunes',
  blurb: 'The refuge filled up at 9:20 and the line has been waiting since. Up on the tower, every scope is pointed at a rare bird that keeps turning out to be a goose.',
  home: [30, 34],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });

    // ---------- The scrub ----------
    // Bayberry and beach plum across the refuge's middle, pitch pines at Sandy Point.
    const BUSHES = [[3.6, 33.2, 0.5], [6.2, 35.6, 0.6], [7.8, 32.4, 0.55], [12.4, 33.9, 0.55], [12.9, 36.6, 0.45], [16.2, 34.9, 0.7], [18.4, 33.9, 0.5], [20.6, 36, 0.55], [29, 34.6, 0.6], [31.4, 35.7, 0.7], [34.2, 34.3, 0.5], [35.2, 36.8, 0.55], [14.6, 36.2, 0.5], [27.6, 36.4, 0.5], [44.6, 36.8, 0.55], [8.9, 38.6, 0.45], [2.6, 35.4, 0.4]];
    BUSHES.forEach(([x, y, r], i) => R.thing(x, y, (ctx) => bush(ctx, x, y, h(x, y), r, BUSH[i % 3])));
    for (const [x, y, s] of [[6.5, 33.8, 0.9], [9.6, 31.9, 1.05], [6.9, 37.6, 0.8]]) R.thing(x + 0.1, y + 0.1, (ctx) => pine(ctx, x, y, h(x, y), s));
    // The deer, in the grass by the scrub, ears up, watching you back.
    const [dx, dy] = [10.5, 35.6];
    R.thing(dx, dy, (ctx, t) => deer(ctx, dx, dy, h(dx, dy), t), { anim: true });

    // ---------- Signs along the refuge road ----------
    sign(R, 14, 31.3, ['SANDY POINT 6 MI', 'NO U-TURNS. YES, YOU.'], { along: 'y', size: 0.22 });

    // ---------- The gate ----------
    // The gatehouse: a cedar booth with a window on the road, a green roof.
    const [gx, gy] = [GATE - 1.2, BLVD - 2.6], gw = 1.6, gd = 1.2, gz = footing(R, gx, gy, gw, gd);
    const booth0 = mix(C.brown, C.wood, 0.45), roof0 = mix(C.green, C.ink, 0.3);
    const boothWin = (ctx, glass) => face(ctx, [[gx + 0.25, gy + gd, gz + 1.0], [gx + 1.35, gy + gd, gz + 1.0], [gx + 1.35, gy + gd, gz + 1.8], [gx + 0.25, gy + gd, gz + 1.8]], glass, { lw: 0.04, stroke: C.white });
    printed(R, gx + gw, gy + gd, (ctx, ink) => {
      const booth = ink(booth0), roof = ink(roof0);
      box(ctx, gx, gy, gz, gw, gd, 2.3, booth, { dotsL: shade(booth, 0.5), dens: 0.14, lw: 0.05 });
      if (Q.detail) {
        ctx.beginPath();
        for (let z = gz + 0.3; z < gz + 2.25; z += 0.28) { line(ctx, [gx, gy + gd, z], [gx + gw, gy + gd, z]); line(ctx, [gx + gw, gy + gd, z], [gx + gw, gy, z]); }
        ctx.strokeStyle = alpha(shade(booth, 0.4), 0.6); ctx.lineWidth = 0.025; ctx.stroke();
      }
      boothWin(ctx, tint(C.sky, 0.2));
      // The sill, the counter, and a door on the side.
      box(ctx, gx + 0.15, gy + gd, gz + 0.92, 1.3, 0.2, 0.08, C.white, { flat: true, lw: 0.03 });
      face(ctx, [[gx + gw, gy + 0.3, gz], [gx + gw, gy + 0.95, gz], [gx + gw, gy + 0.95, gz + 1.8], [gx + gw, gy + 0.3, gz + 1.8]], shade(C.teal, 0.1), { lw: 0.04 });
      // A hip roof, overhanging.
      const t0 = gz + 2.3, o = 0.25, top = [gx + gw / 2, gy + gd / 2, t0 + 0.7];
      const c = [[gx - o, gy - o, t0], [gx + gw + o, gy - o, t0], [gx + gw + o, gy + gd + o, t0], [gx - o, gy + gd + o, t0]];
      face(ctx, [c[0], c[1], top], shade(roof, 0.2), { lw: 0.04 });
      face(ctx, [c[1], c[2], top], shade(roof, 0.1), { lw: 0.04 });
      face(ctx, [c[3], c[2], top], roof, { lw: 0.04, dots: Q.detail ? shade(roof, 0.5) : null, density: 0.15 });
      board(ctx, 'x', gx + gw / 2, gy + gd + 0.02, gz + 2.05, 1.3, 0.3, null, { board: SIGN, edge: 0.03 });
      letters(ctx, 'x', gx + gw / 2, gy + gd + 0.02, gz + 2.05, ['PAY HERE'], 0.2);
      // The ranger's mug on the sill.
      box(ctx, gx + 1.15, gy + gd + 0.04, gz + 1.0, 0.12, 0.12, 0.14, C.white, { flat: true, lw: 0.02 });
    }, { veil: (ctx, v) => {
      const t0 = gz + 2.3, o = 0.25, top = [gx + gw / 2, gy + gd / 2, t0 + 0.7];
      const c = [[gx - o, gy - o, t0], [gx + gw + o, gy - o, t0], [gx + gw + o, gy + gd + o, t0], [gx - o, gy + gd + o, t0]];
      v([[gx, gy, gz, gw, gd, 2.3]], [[c[0], c[1], top], [c[1], c[2], top], [c[3], c[2], top]]);
    } });
    R.thing(gx + gw + 0.01, gy + gd + 0.01, (ctx) => boothWin(ctx, LIT), { on: lightsOn });
    // Its lamp, on a post behind the booth.
    const [lx, ly] = [GATE - 1.75, BLVD - 2.4], lz = footing(R, lx, ly);
    const lampHead = (ctx, col) => { box(ctx, lx - 0.18, ly - 0.18, lz + 3.0, 0.36, 0.36, 0.22, col, { flat: true, lw: 0.035 }); box(ctx, lx - 0.26, ly - 0.26, lz + 3.22, 0.52, 0.52, 0.08, shade(C.ink, 0.1), { flat: true, lw: 0.03 }); };
    R.thing(lx + 0.1, ly + 0.1, (ctx) => { box(ctx, lx - 0.06, ly - 0.06, lz, 0.12, 0.12, 3.0, shade(C.grey, 0.3), { flat: true, lw: 0.03 }); lampHead(ctx, C.greyLight); });
    R.thing(lx + 0.11, ly + 0.11, (ctx) => lampHead(ctx, LIT), { on: lightsOn });
    nightGlow(R, lx, ly, lz + 2.9, 2.6, LIT, 0.8);

    // The entrance sign, facing the line, with the plate the ranger swaps.
    const [ex, ey] = [GATE, BLVD + 2.2], ez = footing(R, ex, ey);
    R.thing(ex + 0.1, ey + 1.2, (ctx) => {
      for (const py of [ey - 0.9, ey + 0.9]) box(ctx, ex - 0.06, py - 0.06, ez, 0.12, 0.12, 2.1, POST, { flat: true, lw: 0.03 });
      board(ctx, 'y', ex + 0.08, ey, ez + 1.75, 2.3, 0.72, null, { board: SIGN });
      letters(ctx, 'y', ex + 0.08, ey, ez + 1.75, ['PARKER RIVER', 'WILDLIFE REFUGE'], 0.24);
      ctx.beginPath(); line(ctx, [ex + 0.1, ey - 0.6, ez + 1.39], [ex + 0.1, ey - 0.6, ez + 1.18]); line(ctx, [ex + 0.1, ey + 0.6, ez + 1.39], [ex + 0.1, ey + 0.6, ez + 1.18]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
    });
    const plate = (text, col, ink, on) => R.thing(ex + 0.12, ey + 1.21, (ctx) => {
      board(ctx, 'y', ex + 0.1, ey, ez + 0.95, 1.9, 0.42, null, { board: col, edge: 0.04 });
      letters(ctx, 'y', ex + 0.1, ey, ez + 0.95, [text], 0.22, ink);
    }, { on });
    plate('REFUGE FULL', C.coral, C.white, full);
    plate('OPEN · $5', C.white, SIGN, open);
    plate('CLOSED', SIGN, C.white, closed);

    // The chain across the road at night (and the sign everyone ignores).
    const cx = GATE - 2.2, cy0 = 30.05, cy1 = 32.25, cz0 = footing(R, cx, cy0), cz1 = footing(R, cx, cy1);
    R.thing(cx + 0.1, cy1 + 0.1, (ctx) => {
      for (const [y, z] of [[cy0, cz0], [cy1, cz1]]) { box(ctx, cx - 0.09, y - 0.09, z, 0.18, 0.18, 0.95, C.white, { flat: true, lw: 0.035 }); if (Q.detail) box(ctx, cx - 0.1, y - 0.1, z + 0.6, 0.2, 0.2, 0.14, C.coral, { flat: true, lw: 0.02 }); }
    });
    const chain = (ctx, pts) => {
      ctx.beginPath(); pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.stroke();
      if (Q.detail) { ctx.setLineDash([0.08, 0.08]); ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.05; ctx.stroke(); ctx.setLineDash([]); }
    };
    R.thing(cx + 0.12, cy1 + 0.12, (ctx) => {
      const pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10, y = cy0 + (cy1 - cy0) * k; pts.push([cx, y, cz0 + (cz1 - cz0) * k + 0.85 - Math.sin(k * Math.PI) * 0.35]); }
      chain(ctx, pts);
      board(ctx, 'y', cx + 0.03, (cy0 + cy1) / 2, cz0 + 0.55, 0.7, 0.26, null, { board: C.coral, edge: 0.03 });
    }, { on: closed });
    R.thing(cx + 0.12, cy1 + 0.12, (ctx) => chain(ctx, [[cx, cy1, cz1 + 0.85], [cx + 0.02, cy1 - 0.05, cz1 + 0.2], [cx + 0.1, cy1 + 0.02, cz1 + 0.5], [cx + 0.02, cy1 + 0.08, cz1 + 0.1]]), { on: (t) => !closed(t) });
    sign(R, GATE - 2.6, 33.1, ['CLOSED', 'SUNSET TO SUNRISE'], { along: 'y', size: 0.22 });

    // The ranger's day: unhooks the chain at 7:40, waves people in, hangs
    // REFUGE FULL at 9:20, points at it every time the same car comes back,
    // flips it to OPEN at five (just as the line gives up), watches the
    // sunset, hooks the chain across, and stays in the booth all night.
    const win = [GATE - 0.5, BLVD - 0.85], post = [cx + 0.3, cy0 + 0.35], hang = [ex + 0.7, ey];
    const rangerWalk = schedule([
      win, { until: at(7.35) },
      post, { until: at(7.75), pose: 'carry', line: 'Morning!' },
      win, { until: at(9.3), pose: 'wave' },
      hang, { until: at(9.55), pose: 'carry', dir: 'l' },
      win, { until: at(17), pose: 'coffee' },
      hang, { until: at(17.35), pose: 'carry', dir: 'l', line: 'OPEN!' },
      win, { until: at(19.8), pose: 'book' },
      { until: at(20.9), pose: 'stand', dir: 'r', back: true },
      post, { until: at(21.15), pose: 'carry' },
      win,
    ], { loop: LOOP, name: 'The ranger', speed: 1.3 });
    R.mover((t) => {
      const p = rangerWalk(t), a = aside(p.x, p.y, t);
      return { ...p, x: p.x + a.dx, y: p.y + a.dy, k: a.k };
    }, (ctx, t, p) => {
      const hr = hour(t);
      if (hr < 7.35 || hr >= 21.3) return;
      let pose = p.moving ? 'walk' : p.pose, dir = p.dir, back = p.back, arms = null, held = null, text = p.line || null;
      if (!p.moving && p.pose === 'coffee') {
        dir = 'r'; back = false;
        if (trierAtGate(t)) { pose = 'point'; if (trierAtGate(t - 2)) text = 'STILL FULL.'; }
        else { pose = 'carry'; held = 'cup'; arms = (((t % 8) + 8) % 8) < 1.4 ? [2.6, 0.2] : [1.3, 0.2]; }
      } else if (!p.moving && p.pose === 'book') { pose = 'read'; held = 'book'; arms = [1.0, 0.9]; dir = 'r'; back = false; }
      else if (!p.moving && p.pose === 'wave' && (((t % 12) + 12) % 12) < 2.5) text = 'Morning!';
      if (p.k > 0.5) { pose = 'wave'; arms = null; held = null; text = null; }
      const z = h(p.x, p.y);
      who(ctx, p.x, p.y, z, rangerLook(arms, held), null, { pose, dir, back }, t);
      if (text) say(ctx, p.x, p.y, z + 2.9, text);
    }, { bias: 1 });

    // Bikes, sailing past the line and into the refuge (and one coming out).
    [[0, 1, C.teal, 221], [21, 1, C.coral, 223], [33, -1, C.mustard, 225]].forEach(([ph, into, color, seed], i) => {
      const look = folk(seed, { hat: 'helmet' }), period = 44;
      R.mover((t) => {
        const k = ((((t + ph) % period) + period) % period) / period, x = into > 0 ? 47.4 - k * 42 : 5.4 + k * 42;
        return { x, y: trackY(x) + (into > 0 ? 0.35 : -0.35) };
      }, (ctx, t, p) => {
        const hr = hour(t);
        if (hr < 6.5 || hr > 19.6) return;
        const z = h(p.x, p.y);
        bike(ctx, p.x, p.y, z, -into, color, look, t);
        if (i === 0 && full(t) && p.x > 43.5) say(ctx, p.x, p.y, z + 3.1, 'DING DING');
      });
    });

    // ---------- Lot 1 ----------
    // Full of birders' cars by nine; they go home as it gets dark. One has
    // a kayak on the roof, still strapped down at five.
    [[37, 7, 18.2, {}], [38.5, 7.6, 19.4, { board: C.mustard }], [40.4, 8.3, 17.6, { rack: true }], [41.9, 9.1, 20.95]].forEach(([x, a, b, o], i) => {
      const y = M0 + 1.6;
      R.thing(x + 0.5, y + 1, (ctx) => car(ctx, x, y, h(x, y), CARS[(i * 3 + 1) % CARS.length], 'y', null, 0, null, o || {}), { on: (t) => { const hr = hour(t); return hr >= a && hr < b; } });
    });
    sign(R, 36.1, 33.6, ['LOT 1', 'FULL SINCE 9:14'], { along: 'y', size: 0.22 });
    sign(R, 37.5, 36.6, ['STAY ON THE BOARDWALK', 'THE DUNES ARE SHY'], { size: 0.2 });

    // Its boardwalk, up over the dunes and down to the beach.
    const zL = (y) => Math.max(h(WALK - 0.6, y), h(WALK, y), h(WALK + 0.6, y)) + 0.2;
    walkway(R, 'y', M1, 43.6, WALK - 0.6, WALK + 0.6, zL);
    const onL = (x, y) => (Math.abs(x - WALK) < 0.6 && y > M1 ? zL(y) : h(x, y));
    // Sand fence along the dune, either side of it.
    // (Each side one picture, sorted at its back end: nobody walks along it.)
    for (const [x0, x1] of [[34.4, 39.2], [40.9, 44.6]]) {
      R.thing(x0 + 1.2, 41.3, (ctx) => {
      for (let x = x0; x < x1 - 0.01; x += 1.2) {
        const xb = Math.min(x1, x + 1.2), y = 41.3;
        {
          ctx.beginPath();
          for (let u = x; u <= xb + 0.001; u += 0.2) { const z = h(u, y); line(ctx, [u, y, z], [u, y, z + 0.8]); }
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
          ctx.strokeStyle = tint(C.wood, 0.3); ctx.lineWidth = 0.045; ctx.stroke();
          ctx.beginPath();
          for (const k of [0.2, 0.62]) line(ctx, [x, y, h(x, y) + k], [xb, y, h(xb, y) + k]);
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
        }
      }
      });
    }

    // Two birders on the boardwalk, binoculars up, following the goose a
    // beat behind; they step off it for the greenhead man.
    [[WALK + 0.2, 38.4, 191], [WALK - 0.2, 40.6, 193]].forEach(([x, y, s], i) => {
      const look = folk(s, { hat: i ? 'sun' : null, wear: vest, face: binocs });
      R.mover((t) => { const a = aside(x, y, t); return { x: x + a.dx, y: y + a.dy, k: a.k }; }, (ctx, t, p) => {
        const hr = hour(t);
        if (hr < 6 || hr > 20.9) return;
        const z = onL(p.x, p.y);
        if (sunsetWatch(t)) return who(ctx, p.x, p.y, z, { ...look, face: null }, null, { pose: 'point', dir: 'r', back: true }, t);
        if (p.k > 0.5) return who(ctx, p.x, p.y, z, { ...look, face: null }, null, { pose: 'wave', dir: i ? 'r' : 'l' }, t);
        const aim = aimAt(t + (i ? 0.4 : 0.8));
        who(ctx, p.x, p.y, z, { ...look, arms: [2.4, 2.25] }, null, { pose: 'stand', dir: aim.x - aim.y - (p.x - p.y) >= 0 ? 'r' : 'l' }, t);
      }, { bias: 1.3 });
    });

    // A family unloading at the last car: a Gander Cola cooler, a kid who
    // has spotted the goose, and a parent who hasn't.
    const [fx, fy] = [42.6, 35.8];
    R.thing(42.3, 36.35, (ctx) => {
      const z = h(41.9, 36.05);
      box(ctx, 41.6, 35.8, z, 0.7, 0.45, 0.48, BRAND.can, { flat: true, lw: 0.04, top: C.white });
      board(ctx, 'x', 41.95, 36.26, z + 0.24, 0.66, 0.2, null, { board: BRAND.can, edge: 0 });
      letters(ctx, 'x', 41.95, 36.26, z + 0.24, [BRAND.name], 0.12, BRAND.ink);
    }, { on: (t) => { const hr = hour(t); return hr >= 9.1 && hr < 20.95; } });
    const parent = folk(231, { hat: 'sun' }), kid = folk(233, { style: 'pony' });
    R.mover((t) => { const a = aside(fx, fy, t); return { x: fx + a.dx, y: fy + a.dy, k: a.k }; }, (ctx, t, p) => {
      const hr = hour(t);
      if (hr < 9.1 || hr >= 20.95) return;
      const z = h(p.x, p.y), watch = sunsetWatch(t), talk = (((t % 36) + 36) % 36);
      who(ctx, p.x, p.y, z, parent, null, watch ? { pose: 'stand', dir: 'r', back: true } : { pose: p.k > 0.5 ? 'wave' : 'carry', dir: 'l' }, t);
      if (!watch && p.k < 0.5 && talk > 3.2 && talk < 5.6) say(ctx, p.x, p.y, z + 2.9, 'It\'s a plover, hon.', -0.6);
    }, { bias: 0.2 });
    R.mover((t) => { const a = aside(fx + 0.7, fy - 0.3, t); return { x: fx + 0.7 + a.dx, y: fy - 0.3 + a.dy, k: a.k }; }, (ctx, t, p) => {
      const hr = hour(t);
      if (hr < 9.1 || hr >= 20.95) return;
      const z = h(p.x, p.y), watch = sunsetWatch(t), talk = (((t % 36) + 36) % 36);
      const g = gooseAt(t), dir = g.x - g.y - (p.x - p.y) >= 0 ? 'r' : 'l';
      who(ctx, p.x, p.y, z, kid, null, watch ? { pose: 'stand', dir: 'r', back: true, scale: 0.7 } : { pose: p.k > 0.5 ? 'wave' : talk < 6 ? 'point' : 'jump', dir, scale: 0.7 }, t);
      if (!watch && p.k < 0.5 && talk < 2.6) say(ctx, p.x, p.y, z + 2.1, 'GOOSE!');
    });
    // A man at the lot's edge in a cloud of bug spray. It isn't working.
    const [sx, sy] = [43.3, 34.6], sprayer = folk(237, { top: C.white, hat: 'cap' });
    R.mover((t) => { const a = aside(sx, sy, t); return { x: sx + a.dx, y: sy + a.dy, k: a.k }; }, (ctx, t, p) => {
      const hr = hour(t);
      if (hr < 8 || hr >= 20.95) return;
      const z = h(p.x, p.y);
      if (sunsetWatch(t)) return who(ctx, p.x, p.y, z, sprayer, null, { pose: 'stand', dir: 'r', back: true }, t);
      who(ctx, p.x, p.y, z, sprayer, null, { pose: p.k > 0.5 ? 'wave' : 'point', dir: 'l' }, t);
      if (!Q.detail) return;
      const n = p.k > 0.3 ? 9 : 5;
      particles(t, n, 1.8, (k, r) => {
        const a = r() * TAU, d = 0.2 + k * 0.9;
        disc(ctx, p.x - 0.5 - k * 0.4 + Math.cos(a) * d * 0.4, p.y + 0.2 + Math.sin(a) * d * 0.4, z + 1.7 + k * 0.6, 0.06 + k * 0.2, alpha(C.white, 0.55 * (1 - k)), { stroke: false });
      }, 7);
      // The flies it's not keeping off.
      for (let i = 0; i < 5; i++) {
        const a = t * 5 + i * 1.3;
        disc(ctx, p.x + Math.cos(a) * 0.5, p.y + Math.sin(a * 1.2) * 0.4, z + 2.2 + Math.sin(a * 1.7) * 0.3, 0.06, C.ink, { stroke: false });
      }
    }, { bias: 0.1 });

    // ---------- Hellcat ----------
    // Its little gravel lot off the refuge road, a trail sign that lists the
    // hazards, a portable toilet with a queue of one, and a rabbit.
    const hl = [23.4, 34, 27.9, 36];
    R.rug((ctx) => {
      const [x0, y0, x1, y1] = hl, pts = [];
      for (let x = x0; x <= x1; x += 0.5) pts.push([x, y0, h(x, y0) + 0.02]);
      for (let y = y0; y <= y1; y += 0.5) pts.push([x1, y, h(x1, y) + 0.02]);
      for (let x = x1; x >= x0; x -= 0.5) pts.push([x, y1, h(x, y1) + 0.02]);
      for (let y = y1; y >= y0; y -= 0.5) pts.push([x0, y, h(x0, y) + 0.02]);
      face(ctx, pts, LAND.track, { stroke: shade(LAND.track, 0.2), lw: 0.04, dots: Q.detail ? shade(LAND.track, 0.3) : null, density: 0.12 });
      // A path across the road to the boardwalk.
      const path = [[26.1, 31.3], [27, 31.3], [27, 34], [26.1, 34]].map(([x, y]) => [x, y, h(x, y) + 0.02]);
      face(ctx, path, LAND.track, { stroke: false });
    });
    [[24, 7.8, 19.2], [25.4, 10.4, 18.6]].forEach(([x, a, b], i) => {
      const y = 35;
      R.thing(x + 0.5, y + 1, (ctx) => car(ctx, x, y, h(x, y), CARS[(i * 5 + 3) % CARS.length], 'y'), { on: (t) => { const hr = hour(t); return hr >= a && hr < b; } });
    });
    const [ux, uy] = [27.1, 34.25], uz = footing(R, ux, uy, 0.8, 0.8);
    printed(R, ux + 0.8, uy + 0.8, (ctx, ink) => {
      box(ctx, ux, uy, uz, 0.8, 0.8, 1.9, ink(C.teal), { dotsL: ink(shade(C.teal, 0.5)), lw: 0.045 });
      box(ctx, ux - 0.04, uy - 0.04, uz + 1.9, 0.88, 0.88, 0.1, C.white, { flat: true, lw: 0.035 });
      face(ctx, [[ux + 0.15, uy + 0.8, uz + 0.05], [ux + 0.65, uy + 0.8, uz + 0.05], [ux + 0.65, uy + 0.8, uz + 1.65], [ux + 0.15, uy + 0.8, uz + 1.65]], ink(shade(C.teal, 0.12)), { lw: 0.035 });
      face(ctx, [[ux + 0.45, uy + 0.8, uz + 1.3], [ux + 0.6, uy + 0.8, uz + 1.3], [ux + 0.6, uy + 0.8, uz + 1.4], [ux + 0.45, uy + 0.8, uz + 1.4]], C.red, { lw: 0.02 });
    }, { veil: (ctx, v) => v([[ux, uy, uz, 0.8, 0.8, 1.9], [ux - 0.04, uy - 0.04, uz + 1.9, 0.88, 0.88, 0.1]]) });
    const waiter = folk(241, { top: C.purple });
    R.mover(() => ({ x: ux + 0.4, y: uy + 1.45 }), (ctx, t, p) => {
      const hr = hour(t);
      if (hr < 8.5 || hr >= 20.95) return;
      const z = h(p.x, p.y), c = (((t % 30) + 30) % 30);
      if (sunsetWatch(t)) return who(ctx, p.x, p.y, z, waiter, null, { pose: 'stand', dir: 'r', back: true }, t);
      // Crossing their legs in place, swatting the odd fly.
      who(ctx, p.x, p.y, z, waiter, null, { pose: c > 20 && c < 23 ? 'wave' : 'walk', dir: 'r', back: true }, t);
      if (c < 2.4) say(ctx, p.x, p.y, z + 2.9, 'Any day now.');
    });
    sign(R, 29.5, 33.5, ['HELLCAT TRAIL', 'TICKS · IVY · GREENHEADS'], { size: 0.2 });
    sign(R, 22.9, 35.2, ['KING TIDE TONIGHT', 'THE BIRDS KNOW'], { along: 'y', size: 0.2 });
    const hop = route([[21.4, 36.6, 3], [22.4, 37.2, 1.5], [21.8, 37.8, 4], [20.9, 37.1, 2]], { speed: 0.9 });
    R.mover((t) => hop(t), (ctx, t, p) => {
      const z = h(p.x, p.y) + (p.moving ? Math.abs(Math.sin(t * 7)) * 0.25 : 0);
      rabbit(ctx, p.x, p.y, z, p.dir);
    });

    // The boardwalk from the tower along the marsh edge, a spur down to the
    // road, and a viewing platform at the far end with a photographer on it.
    const hy0 = 29.5, hy1 = 30.5;
    const zH = (x) => Math.max(h(x, hy0), h(x, 30), h(x, hy1)) + 0.2;
    walkway(R, 'x', 21.7, 29.6, hy0, hy1, zH);
    const zS = (y) => Math.max(h(26.1, y), h(27, y)) + 0.2;
    walkway(R, 'y', hy1, 31.3, 26.1, 27, (y) => Math.max(zS(y), zH(26.5)));
    const [qx, qy] = [29.6, 29], qz = Math.max(zH(29.6), zH(31.6)) + 0.05;
    R.thing(qx + 2, qy + 2, (ctx) => {
      for (const [px, py] of [[qx + 0.1, qy + 1.8], [qx + 1.8, qy + 1.8], [qx + 1.8, qy + 0.1]]) box(ctx, px, py, h(px, py) - 0.1, 0.12, 0.12, qz - h(px, py), POST, { flat: true, lw: 0.025 });
      box(ctx, qx, qy, qz - 0.14, 2, 2, 0.14, DECK, { flat: true, lw: 0.04, left: shade(DECK, 0.28), right: shade(DECK, 0.14) });
      if (Q.detail) { ctx.beginPath(); for (let u = qx + 0.25; u < qx + 2; u += 0.25) line(ctx, [u, qy, qz], [u, qy + 2, qz]); ctx.strokeStyle = alpha(shade(DECK, 0.4), 0.7); ctx.lineWidth = 0.025; ctx.stroke(); }
      // Rails on the three sides away from the boardwalk.
      ctx.beginPath();
      line(ctx, [qx, qy, qz + RAIL], [qx + 2, qy, qz + RAIL]); line(ctx, [qx + 2, qy, qz + RAIL], [qx + 2, qy + 2, qz + RAIL]); line(ctx, [qx + 2, qy + 2, qz + RAIL], [qx, qy + 2, qz + RAIL]);
      for (const [px, py] of [[qx, qy], [qx + 1, qy], [qx + 2, qy], [qx + 2, qy + 1], [qx + 2, qy + 2], [qx + 1, qy + 2], [qx, qy + 2]]) line(ctx, [px, py, qz], [px, py, qz + RAIL]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
      ctx.strokeStyle = DECK; ctx.lineWidth = 0.05; ctx.stroke();
      // A bench, facing the marsh.
      box(ctx, qx + 0.3, qy + 1.2, qz + 0.45, 1.4, 0.4, 0.08, tint(C.wood, 0.2), { flat: true, lw: 0.03 });
      for (const bx of [qx + 0.4, qx + 1.55]) box(ctx, bx, qy + 1.3, qz, 0.08, 0.2, 0.45, POST, { flat: true, lw: 0.02 });
    });
    // The photographer: back to you, a lens as long as his arm, pointed at
    // the marsh all day (so he's already facing the right way at sunset).
    const snapper = folk(245, { top: KHAKI, bottom: C.brown, hat: 'sun', wear: vest });
    R.thing(qx + 1.3, qy + 0.9, (ctx) => {
      const x = qx + 1.1, y = qy + 0.6;
      who(ctx, x, y, qz, { ...snapper, arms: [1.9, 1.7] }, null, { pose: 'stand', dir: 'r', back: true });
      const a = P(x + 0.15, y - 0.15, qz + 1.8), b = P(x + 0.5, y - 0.6, qz + 1.92), c = P(x + 0.62, y - 0.76, qz + 1.95);
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(...b); ctx.lineTo(...c);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.36; ctx.stroke();
    }, { on: (t) => { const hr = hour(t); return hr >= 5.6 && hr < 20.95; } });
    // A couple strolling the boardwalk; they stop to watch the sunset.
    const stroll = route([[23.4, 30, 3], [29.4, 30, 5]], { loop: false, speed: 0.55 });
    [[0, 247, 0], [0.9, 249, 0.28]].forEach(([lag, s, off]) => {
      const look = folk(s);
      R.mover((t) => {
        const tt = sunsetWatch(t) ? at(19.8) : t, p = stroll(tt - lag);
        return { ...p, y: p.y + (off ? 0.28 : -0.2), frozen: tt !== t };
      }, (ctx, t, p) => {
        const hr = hour(t);
        if (hr < 7 || hr >= 20.9) return;
        const pose = p.frozen ? { pose: 'stand', dir: 'r', back: true } : { pose: p.moving ? 'walk' : 'point', dir: p.moving ? p.dir : 'r', back: p.moving ? p.back : true };
        who(ctx, p.x, p.y, zH(p.x), look, null, pose, t);
      }, { bias: 1.2 });
    });

    // ---------- The observation tower ----------
    const [tx, ty] = TOWER, tz = footing(R, tx, ty, 2.4, 2.4), deck = tz + 5;
    const railTo = (ctx, a, b) => {
      ctx.beginPath();
      line(ctx, [...a, deck + 1.05], [...b, deck + 1.05]); line(ctx, [...a, deck + 0.55], [...b, deck + 0.55]);
      const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.7);
      for (let i = 0; i <= n; i++) { const k = i / n, p = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; line(ctx, [...p, deck + 0.22], [...p, deck + 1.05]); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke();
      ctx.strokeStyle = tint(C.wood, 0.15); ctx.lineWidth = 0.07; ctx.stroke();
    };
    printed(R, tx + 2.4, ty + 2.4, (ctx, ink) => {
      const POST = ink(POST0), DECK = ink(DECK0);
      const legs = [[tx, ty], [tx + 2.2, ty], [tx, ty + 2.2], [tx + 2.2, ty + 2.2]];
      for (const [px, py] of legs) box(ctx, px, py, tz - 0.2, 0.22, 0.22, 5.2, POST, { flat: true, lw: 0.035 });
      // Cross-bracing on the two faces you see, in two tiers.
      ctx.beginPath();
      for (const [z0, z1] of [[tz + 0.2, tz + 2.5], [tz + 2.5, deck - 0.1]]) {
        line(ctx, [tx + 0.1, ty + 2.42, z0], [tx + 2.3, ty + 2.42, z1]); line(ctx, [tx + 0.1, ty + 2.42, z1], [tx + 2.3, ty + 2.42, z0]);
        line(ctx, [tx + 2.42, ty + 0.1, z0], [tx + 2.42, ty + 2.3, z1]); line(ctx, [tx + 2.42, ty + 0.1, z1], [tx + 2.42, ty + 2.3, z0]);
      }
      line(ctx, [tx, ty + 2.42, tz + 2.5], [tx + 2.42, ty + 2.42, tz + 2.5]); line(ctx, [tx + 2.42, ty + 2.42, tz + 2.5], [tx + 2.42, ty, tz + 2.5]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke();
      ctx.strokeStyle = POST; ctx.lineWidth = 0.06; ctx.stroke();
      // The stairs up the side: two flights and a landing.
      const sx0 = tx + 2.45, sx1 = tx + 3.1;
      const flight = (y0, z0, y1, z1) => {
        face(ctx, [[sx0, y0, z0], [sx1, y0, z0], [sx1, y1, z1], [sx0, y1, z1]], DECK, { lw: 0.04 });
        if (!Q.detail) return;
        ctx.beginPath();
        for (let k = 0.1; k < 1; k += 0.1) { const y = y0 + (y1 - y0) * k, z = z0 + (z1 - z0) * k; line(ctx, [sx0, y, z], [sx1, y, z]); }
        ctx.strokeStyle = shade(DECK, 0.45); ctx.lineWidth = 0.03; ctx.stroke();
      };
      flight(ty + 0.1, tz + 2.5, ty + 1.9, deck);
      box(ctx, sx0, ty - 0.3, tz + 2.38, sx1 - sx0, 0.7, 0.12, DECK, { flat: true, lw: 0.035 });
      flight(ty + 2.1, zH(21.7), ty + 0.3, tz + 2.4);
      ctx.beginPath(); line(ctx, [sx1, ty + 2.1, zH(21.7) + RAIL], [sx1, ty + 0.3, tz + 2.4 + RAIL]); line(ctx, [sx1, ty + 0.1, tz + 2.5 + RAIL], [sx1, ty + 1.9, deck + RAIL]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
      // The deck, and its rails at the back.
      box(ctx, tx - 0.2, ty - 0.2, deck, 2.8, 2.8, 0.22, DECK, { flat: true, lw: 0.045, left: shade(DECK, 0.28), right: shade(DECK, 0.14) });
      railTo(ctx, [tx - 0.15, ty + 2.55], [tx - 0.15, ty - 0.15]);
      railTo(ctx, [tx - 0.15, ty - 0.15], [tx + 2.55, ty - 0.15]);
    }, { depth: tx + ty + 4 });
    // Its front rails, over the birders' legs, with a plaque.
    R.thing(tx + 2.6, ty + 2.6, (ctx) => {
      railTo(ctx, [tx - 0.15, ty + 2.55], [tx + 2.55, ty + 2.55]);
      railTo(ctx, [tx + 2.55, ty + 2.55], [tx + 2.55, ty - 0.15]);
      board(ctx, 'x', tx + 1.2, ty + 2.6, deck + 0.8, 1.95, 0.42, null, { board: SIGN, edge: 0.03 });
      letters(ctx, 'x', tx + 1.2, ty + 2.6, deck + 0.8, ['MAX 8 BIRDERS', 'PLEASE SHARE SCOPES'], 0.15);
    }, { depth: tx + ty + 9 });
    sign(R, 17.4, 31.7, ['OBSERVATION', 'TOWER'], { size: 0.22, post: 1.0 });

    // The birders, and every scope swinging to where the goose just was.
    // Pidge's points at the beach: he's sure one of the plovers is the goose.
    const PIDGE_AT = [15.5, 50];
    [[tx + 0.5, ty + 0.5, 181, C.greyLight], [tx + 1.7, ty + 0.6, 183, C.green], [tx + 0.6, ty + 1.8, 185, C.mustard], [tx + 1.8, ty + 1.8, 0, C.coral]].forEach(([x, y, s, scopeColor], i) => {
      const pidge = s === 0;
      const look = pidge ? pidgeLook : folk(s, { hat: i === 1 ? 'sun' : null, wear: vest });
      const jit = [[0, 0], [0.6, -0.4], [-0.5, 0.3]][i] || [0, 0];
      R.mover(() => ({ x, y }), (ctx, t) => {
        const hr = hour(t);
        if (hr < 5.5 || hr > 20.95) return;
        const z = deck + 0.22, watch = sunsetWatch(t);
        let tgt;
        if (watch) tgt = [x + 1.6, y - 5];
        else if (pidge) tgt = PIDGE_AT;
        else { const a = aimAt(t); tgt = [a.x + jit[0], a.y + jit[1]]; }
        const ex = tgt[0] - x, ey = tgt[1] - y, d = Math.hypot(ex, ey) || 1, ux = ex / d, uy = ey / d;
        const dir = ux - uy >= 0 ? 'r' : 'l', back = ux + uy < 0;
        const sp = [x + ux * 0.55, y + uy * 0.55];
        const body = () => who(ctx, x, y, z, { ...look, arms: [2.3, 2.05] }, null, { pose: 'stand', dir, back }, t);
        if (ux + uy > 0) { body(); scope(ctx, sp[0], sp[1], z, ux, uy, scopeColor); } else { scope(ctx, sp[0], sp[1], z, ux, uy, scopeColor); body(); }
        if (watch) return;
        const a = aimAt(t);
        if (i === 1 && a.k % 2 === 0 && a.local > 0.2 && a.local < 1.9) say(ctx, x, y, z + 2.9, 'THERE!');
        if (i === 0 && wrapN(a.k, 2) === 1 && a.local > 4.4 && a.local < 6.2) say(ctx, x, y, z + 2.9, 'Gone again.', -0.8);
        if (pidge && wrapN(a.k, 3) === 2 && a.local > 6.3 && a.local < 8.6) say(ctx, x, y, z + 2.9, 'That plover\'s a goose.', 0.8);
      }, { depth: tx + ty + 5 + i * 0.3 });
    });

    // ---------- The marsh edge ----------
    // Greenhead traps (the flies are winning), and the flies round one.
    for (const [x, y] of [[8.4, 29.8], [26, 28.8], [33.4, 29]]) trap(R, x, y);
    R.thing(33.5, 29.5, (ctx, t) => {
      const hr = hour(t);
      if (!Q.detail || hr < 8 || hr > 20) return;
      const z = footing(R, 33, 28.6, 0.8, 0.8) + 1.8;
      for (let i = 0; i < 6; i++) { const a = t * 4 + i * 1.7; disc(ctx, 33.4 + Math.cos(a) * 0.6, 29 + Math.sin(a * 1.3) * 0.5, z + Math.sin(a * 2.1) * 0.35, 0.05, C.ink, { stroke: false }); }
    }, { anim: true });
    // A snowy egret, stalking the back shore.
    const stalk = route([[10.4, 28.5, 5], [13.8, 28.6, 4], [12.2, 28.9, 6]], { speed: 0.18 });
    R.mover((t) => stalk(t), (ctx, t, p) => egret(ctx, p.x, p.y, h(p.x, p.y), t, p.dir));
    // Tree swallows, working the air over the dunes all day.
    R.air((ctx, t) => {
      const hr = hour(t);
      if (!Q.detail || hr < 6 || hr > 20.4) return;
      // Each a navy bird with a white belly and swept wings, so pinched in
      // they read as swallows, not stray ink ticks on the grass.
      for (let i = 0; i < 7; i++) {
        const a = t * (0.45 + (i % 3) * 0.12) + i * 0.9, [X, Y] = P(30 + Math.cos(a) * (4 + (i % 3) * 1.6), 36 + Math.sin(a * 1.3) * 2.6, 6 + Math.sin(a * 2 + i) * 0.8);
        const f = 0.16 + 0.08 * Math.sin(t * 14 + i);
        ctx.beginPath();
        ctx.moveTo(X - 0.34, Y - f); ctx.quadraticCurveTo(X - 0.12, Y - 0.1, X, Y - 0.02); ctx.quadraticCurveTo(X + 0.12, Y - 0.1, X + 0.34, Y - f);
        ctx.quadraticCurveTo(X + 0.12, Y - 0.02, X, Y + 0.05); ctx.quadraticCurveTo(X - 0.12, Y - 0.02, X - 0.34, Y - f);
        ctx.fillStyle = C.navy; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(X, Y + 0.02, 0.07, 0.05, 0, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
      }
    });

    // ---------- After dark ----------
    // Two people with a flashlight step over the chain and go out Lot 1's
    // boardwalk to see the king tide. It says sunset to sunrise.
    const sneak = schedule([
      [cx + 0.6, 32.9], { until: at(22.4) },
      [42.4, 34.4], [WALK, 36.4], [WALK, 42.6], { until: at(24.6), pose: 'point', dir: 'l', line: 'Look at it come in!' },
      [WALK, 36.4], [42.4, 34.4], [cx + 0.6, 32.9],
    ], { loop: LOOP, name: 'The flashlight', speed: 1.1 });
    const out = (t) => { const hr = hour(t); return hr >= 22.4 || hr < 1.3; };
    [[0, 251], [0.9, 253]].forEach(([lag, s], i) => {
      const look = folk(s, { top: i ? C.navy : C.purple });
      R.mover((t) => { const p = sneak(t - lag); return { ...p, x: p.x + (i ? 0.35 : 0) }; }, (ctx, t, p) => {
        if (!out(t)) return;
        const z = onL(p.x, p.y);
        who(ctx, p.x, p.y, z, look, null, { pose: p.moving ? 'walk' : p.pose, dir: p.dir, back: p.back }, t);
        if (!i && p.line && ((t % 10) + 10) % 10 < 3) say(ctx, p.x, p.y, z + 2.9, p.line);
      }, { bias: 1.3 });
    });
    R.light({ at: (t) => { const p = sneak(t); return [p.x + (p.back ? -0.4 : 0.4), p.y - (p.back ? 0.6 : -0.6), onL(p.x, p.y) + 0.4]; }, r: 1.5, color: LIT, k: (t) => (out(t) ? 0.75 : 0) });

    // ---------- The goose ----------
    // Popping up in the dunes, honking, and gone by the time the scopes get there.
    R.goose((t) => {
      const g = gooseAt(t);
      return { x: g.x, y: g.y, z: h(g.x, g.y), dir: g.moving ? g.dir : 'l', pose: g.moving ? 'walk' : g.local < 1.2 ? 'honk' : g.local > 3 ? 'peck' : 'stand', moving: g.moving };
    });

    // ---------- The finds ----------
    // A birder's lens cap, dropped on Lot 1's boardwalk.
    const lc = [WALK + 0.3, 39.6], lcz = zL(lc[1]) + 0.01;
    R.thing(lc[0], lc[1], (ctx) => {
      const [x, y] = lc;
      disc(ctx, x + 0.05, y + 0.05, lcz, 0.26, alpha(C.ink, 0.25), { stroke: false });
      disc(ctx, x, y, lcz + 0.06, 0.24, C.black, { lw: 0.04 });
      disc(ctx, x, y, lcz + 0.07, 0.16, shade(C.grey, 0.5), { stroke: C.grey, lw: 0.025 });
      if (Q.detail) disc(ctx, x, y, lcz + 0.08, 0.05, C.white, { stroke: false });
    }, { depth: WALK + 0.6 + Math.ceil(lc[1] - M1) + M1 + 0.1 });
    R.find({ id: 'lens-cap', label: 'A birder\'s lens cap', at: [lc[0], lc[1], lcz + 0.08], r: 0.8 });
    // The deer.
    R.find({ id: 'deer', label: 'A deer in the dunes', at: [dx, dy, h(dx, dy) + 0.9], r: 1 });
    // A checklist on a clipboard, dropped at the foot of the tower stairs:
    // every bird ticked but one, and that one struck out ("GOOSE?").
    const [kx, ky] = [22.2, 30], kz = zH(kx) + 0.02;
    R.thing(kx, ky, (ctx) => {
      const pts = (x0, y0, x1, y1, z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
      face(ctx, pts(kx - 0.28, ky - 0.36, kx + 0.28, ky + 0.36, kz), C.brown, { lw: 0.04 });
      face(ctx, pts(kx - 0.22, ky - 0.28, kx + 0.22, ky + 0.3, kz + 0.01), C.white, { lw: 0.025 });
      face(ctx, pts(kx - 0.1, ky - 0.4, kx + 0.1, ky - 0.3, kz + 0.02), C.grey, { lw: 0.02 });
      ctx.beginPath();
      for (let i = 0; i < 5; i++) { const y = ky - 0.18 + i * 0.1; line(ctx, [kx - 0.14, y, kz + 0.02], [kx + 0.16, y, kz + 0.02]); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.beginPath(); line(ctx, [kx - 0.19, ky + 0.04, kz + 0.02], [kx + 0.2, ky + 0.0, kz + 0.02]);
      ctx.strokeStyle = C.coral; ctx.lineWidth = 0.06; ctx.stroke();
    }, { depth: 22.7 + hy1 + 0.1 });
    R.find({ id: 'checklist', label: 'A checklist, one bird crossed out', at: [kx, ky, kz + 0.05], r: 0.8 });
  },
};
