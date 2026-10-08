// A day at Plum Island: everyone on the island's clock (tide.js), driving
// and walking between the areas. The engine draws each of them in whichever
// area they're in; off the map (the mainland, past the back edge) nobody
// draws them. The areas draw everyone who stays put.
//
// The day (hours; the clock is uneven, so at(h) gives the loop time):
//     5am  the Courier crosses the turnpike at first light with a parcel for
//          "G. Goose, Plum Island", and waits for the drawbridge
//   6:30am he parks at the Center and knocks on every door there
//    10am  the greenhead man gets out of his car, and the swarm finds him
//   9:30am the refuge is full; a line of cars waits on Sunset Drive all day,
//          and one car keeps trying
//    11am  the Courier tries the refuge: stuck in the line until 1:30pm
//     2pm  he asks the lifeguards at the Point
//   4:15pm the drawbridge goes up for a sailboat, and the road waits
//  10:25pm the Courier heads for the mainland, and the king tide has the
//          road by the drawbridge: the van stops in the middle of it
//  12:20am Every King Tide Dave drives out of Bob's Lobster's lot, through
//          the flood, windows down, past the van, as he does every king tide
//
// npm run qa checks every walk: never faster than a run (cars included).
// The walks below are the greybox's, exactly; the art only changes how
// everyone looks.
import { C, Q, P, SKIN, HAIR, folk, box, face, paint, speech, glow, alpha, mix, tint, shade } from '../../engine/art.js';
import { schedule } from '../../engine/actors.js';
import { PIKE, BLVD, GATE, SHACK, BRIDGE, LOTS, roadZ, h } from './land.js';
import { LOOP, KING_AT, at, hour, level, nightK, sunsetWatch } from './tide.js';
import { car, headlights, board, who } from './kit.js';
import { CARS, LIT, lightsOn } from './style.js';
import { GH, ghWalk } from './swarm.js';

const IN = PIKE + 0.6, OUT = PIKE - 0.6; // the turnpike's lanes: onto the island, and off
const SOUTH = BLVD + 0.5, NORTH = BLVD - 0.5; // the island road's lanes
const OFF = -2.5; // the mainland, past the map's back edge
const DRIVE = 3.2, WALK = 1.3;
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const inside = (t, [a, b]) => { const s = wrap(t); return s >= a && s < b; };
// Speech only close up, where it can be read.
const near = () => Q.detail && Q.pxPerUnit >= 12;
const say = (ctx, x, y, z, text, dx = 0) => { if (text && near()) speech(ctx, x, y, z, text, { size: 0.42, dx }); };

// The drawbridge: up at dawn (for a lobster boat, while the Courier waits)
// and mid-afternoon (a sailboat, while the road waits). 0 down, 1 up.
export const OPENINGS = [[5.35, 5.95], [16.2, 16.9]];
export function bridgeUp(t) {
  const hr = hour(t);
  for (const [a, b] of OPENINGS) {
    if (hr >= a - 0.1 && hr < b + 0.1) return Math.min(1, (hr - a + 0.1) / 0.15, (b + 0.1 - hr) / 0.15);
  }
  return 0;
}
// Where cars wait for it, each side.
const WAIT_MAIN = BRIDGE[0] - 2.2, WAIT_ISLAND = BRIDGE[1] + 2.2;

// What the finale is doing (finale.js sets it every frame): while it plays,
// the Courier is up on the van's roof, not at its wheel.
export const scene = { finale: 0 };

// ---------- Drawing kit for the cast ----------
// Which way a vehicle points at every moment of the day, worked out once from
// its walk (so drawing stays a pure function of t): its axis ('x' or 'y') and
// which way along it (+1 or -1). A stop can say { along, facing }.
function headings(walk) {
  const N = LOOP * 4, ax = new Array(N), sg = new Int8Array(N);
  let a = 'y', s = 1;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < N; i++) {
      const t = i / 4, p = walk(t);
      if (p.moving) {
        const q = walk(t + 0.05), r = walk(t - 0.05);
        const dx = q.x - r.x, dy = q.y - r.y;
        if (Math.abs(dx) + Math.abs(dy) > 1e-4) {
          if (Math.abs(dx) > Math.abs(dy)) { a = 'x'; s = dx > 0 ? 1 : -1; } else { a = 'y'; s = dy > 0 ? 1 : -1; }
        }
      } else if (p.along) { a = p.along; if (p.facing) s = p.facing; }
      ax[i] = a; sg[i] = s;
    }
  }
  return (t) => { const i = Math.floor(wrap(t) * 4) % N; return [ax[i], sg[i]]; };
}

// A vehicle's own frame: u along its heading (its front at +u), v across
// (the side you can see at +v), z up. Returns world points.
const frame = (x, y, along, sg) => (along === 'x' ? (u, v, z) => [x + u * sg, y + v, z] : (u, v, z) => [x + v, y + u * sg, z]);
// A box in that frame (it's always square to the world, so box() draws it).
function part(ctx, W, u0, u1, v0, v1, z0, z1, color, o = {}) {
  const [ax, ay] = W(u0, v0, 0), [bx, by] = W(u1, v1, 0);
  box(ctx, Math.min(ax, bx), Math.min(ay, by), z0, Math.abs(bx - ax), Math.abs(by - ay), z1 - z0, color, { lw: 0.04, ...o });
}
// A flat panel on the near side (v = hw, from u0 to u1) or on an end (u, from v0 to v1).
const side = (ctx, W, hw, u0, u1, z0, z1, fill, o) => face(ctx, [W(u0, hw, z0), W(u1, hw, z0), W(u1, hw, z1), W(u0, hw, z1)], fill, { lw: 0.03, ...o });
const end = (ctx, W, u, v0, v1, z0, z1, fill, o) => face(ctx, [W(u, v0, z0), W(u, v1, z0), W(u, v1, z1), W(u, v0, z1)], fill, { lw: 0.03, ...o });

// Only what's above the water, for something with a footprint hl x hw in its
// frame: cut along the waterline's lower edges (exact for a box), then a
// ring of foam where it meets the water and ripples going out.
function above(ctx, W, hl, hw, L, t, draw) {
  const a = W(-hl, -hw, L), b = W(hl, hw, L);
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  const [lx, ly] = P(x0, y1, L), [bx, by] = P(x1, y1, L), [rx, ry] = P(x1, y0, L);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(lx - 3, ly); ctx.lineTo(lx, ly); ctx.lineTo(bx, by); ctx.lineTo(rx, ry); ctx.lineTo(rx + 3, ry);
  ctx.lineTo(rx + 3, ry - 60); ctx.lineTo(lx - 3, ly - 60);
  ctx.closePath();
  ctx.clip();
  draw(ctx);
  ctx.restore();
  if (!Q.lines) return;
  // The foam round it, and two rings spreading out.
  const ring = (e, a2) => {
    ctx.beginPath();
    ctx.moveTo(...P(x0 - e, y0 - e, L)); ctx.lineTo(...P(x1 + e, y0 - e, L)); ctx.lineTo(...P(x1 + e, y1 + e, L)); ctx.lineTo(...P(x0 - e, y1 + e, L));
    ctx.closePath();
    ctx.strokeStyle = alpha(C.white, a2);
    ctx.stroke();
  };
  ctx.lineWidth = 0.06; ctx.lineJoin = 'round';
  ring(0.08, 0.9);
  if (!Q.detail) return;
  ctx.lineWidth = 0.04;
  for (let k = 0; k < 2; k++) { const u = ((t * 0.45 + k * 0.5) % 1); ring(0.2 + u * 1.1, 0.7 * (1 - u)); }
}

// A head at a window (drivers, the kid in the back): skin, hair or a cap.
function head(ctx, x, y, z, o = {}) {
  const [X, Y] = P(x, y, z), r = o.r || 0.17;
  ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); paint(ctx, o.skin || SKIN[0], { lw: 0.03 });
  ctx.beginPath();
  if (o.cap) { ctx.arc(X, Y - r * 0.2, r * 1.05, Math.PI, 0); ctx.rect(X + (o.left ? -r * 1.5 : r * 0.1), Y - r * 0.3, r * 1.4, r * 0.28); paint(ctx, o.cap, { lw: 0.03 }); } else { ctx.arc(X, Y - r * 0.15, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = o.hair || HAIR[0]; ctx.fill(); }
  if (Q.detail && !o.back) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(X + (o.left ? -0.06 : 0.06), Y + 0.01, 0.025, 0, Math.PI * 2); ctx.fill(); }
}
// An arm out of a window, waving: from the sill, up and back and forth.
function armOut(ctx, x, y, z, t, skin, speed = 9) {
  const [X, Y] = P(x, y, z), a = Math.sin(t * speed) * 0.45;
  const ex = X + 0.12 + Math.sin(a) * 0.5, ey = Y - Math.cos(a) * 0.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + 0.12, Y - 0.08); ctx.lineTo(ex, ey);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.19; ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 0.12; ctx.stroke();
  ctx.beginPath(); ctx.arc(ex, ey, 0.09, 0, Math.PI * 2); paint(ctx, skin, { lw: 0.03 });
}
// A bow wave either side of a front end in the water, and a wake.
function bowWave(ctx, W, hl, hw, L, t) {
  if (!Q.lines) return;
  ctx.lineCap = 'round';
  ctx.strokeStyle = alpha(C.white, 0.95); ctx.lineWidth = 0.08;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(...P(...W(hl + 0.2, 0, L)));
    ctx.quadraticCurveTo(...P(...W(hl - 0.2, s * (hw + 0.35), L)), ...P(...W(hl - 1.1, s * (hw + 0.9), L)));
  }
  ctx.stroke();
  if (!Q.detail) return;
  // Spray thrown up off the wave, and churned water behind.
  ctx.fillStyle = C.white;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const u = ((t * 2.2 + i * 0.37) % 1), s = i % 2 ? 1 : -1;
    const [X, Y] = P(...W(hl - 0.1 - u * 0.9, s * (hw + 0.2 + u * 0.7), L + Math.sin(u * Math.PI) * 0.45));
    ctx.moveTo(X + 0.06, Y); ctx.arc(X, Y, 0.06 * (1 - u * 0.5), 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.strokeStyle = alpha(C.white, 0.6); ctx.lineWidth = 0.05;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const u = (t * 1.5 + k / 3) % 1;
    ctx.moveTo(...P(...W(-hl - 0.2 - u * 1.4, -hw * 0.6, L)));
    ctx.lineTo(...P(...W(-hl - 0.2 - u * 1.4, hw * 0.6, L)));
  }
  ctx.stroke();
}
// Small lights on the end you can see: headlamps in front, red lamps behind,
// hazards blinking amber on the corners.
function lamps(ctx, W, hl, hw, sg, z, t, o = {}) {
  if (!Q.detail) return;
  const u = sg > 0 ? hl : -hl, night = lightsOn(t);
  const blink = o.hazard && ((t * 1.7) % 1) < 0.5;
  for (const v of [-hw + 0.16, hw - 0.16]) {
    const [X, Y] = P(...W(u, v, z));
    const c = blink ? C.mustard : sg > 0 ? (night ? LIT : C.white) : (night ? C.coral : C.red);
    ctx.beginPath(); ctx.arc(X, Y, 0.08, 0, Math.PI * 2); paint(ctx, c, { lw: 0.025 });
  }
  if (blink) {
    const [X, Y] = P(...W(u * -1, hw, z));
    ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 });
    const k = nightK(t);
    if (k > 0.2) glow(ctx, ...W(u, 0, z), 1.3, C.mustard, 0.7 * k);
  }
}

// A vehicle on the island's roads: its wheels on the road (up over the
// bridge), and only what's above the water when the road's under.
function vehicle(id, name, color, steps, look, hold = null) {
  const walk = schedule(steps, { loop: LOOP, name, speed: DRIVE });
  // hold: a moment to stay at while the ending plays (the van, in the flood).
  const atT = (t) => { const p = walk(hold != null && scene.finale > 0 ? hold : t); return { ...p, z: roadZ(p.x, p.y) }; };
  const head = headings(walk);
  return {
    id, name, loop: LOOP, color,
    away: true, // off to the mainland, past the map's edge, some of the day
    at: atT,
    draw(ctx, t, p) {
      if (p.hide) return;
      const [along, sg] = head(t), L = level(t);
      look(ctx, t, p, along, sg, L > p.z + 0.02 ? L : null);
    },
  };
}

// ---------- The Courier's van ----------
// A brown parcel van: taller than a car, boxy, a sliding door, PARCELS down
// its side with a goose in a box, and the Courier at the wheel.
export const VAN_TOP = 2; // its roof, over the road
const VAN_LEN = 2.3, VAN_WID = 1.1;
const VAN = shade(C.brown, 0.04), VAN_TRIM = C.butter;
const GLASS = mix(tint(C.sky, 0.25), C.brown, 0.1);
const courierSkin = SKIN[2];
function drawVan(ctx, x, y, z, along, sg, t, o = {}) {
  const W = frame(x, y, along, sg), hl = VAN_LEN / 2, hw = VAN_WID / 2, top = z + VAN_TOP;
  const draw = (g) => {
    if (Q.detail) for (const [u, v] of [[-hl + 0.45, -hw + 0.1], [hl - 0.42, -hw + 0.1], [-hl + 0.45, hw - 0.1], [hl - 0.42, hw - 0.1]]) part(g, W, u - 0.16, u + 0.16, v - 0.14, v + 0.14, z, z + 0.34, C.ink, { flat: true, lw: 0.03 });
    part(g, W, -hl, hl, -hw, hw, z + 0.26, top - 0.06, VAN, { dotsL: shade(VAN, 0.55), dens: 0.14 });
    part(g, W, -hl + 0.05, hl - 0.05, -hw + 0.05, hw - 0.05, top - 0.06, top, tint(VAN, 0.12), { flat: true, lw: 0.03 });
    // The bumper, all round the bottom.
    side(g, W, hw, -hl, hl, z + 0.26, z + 0.42, shade(C.ink, 0.1), { stroke: false });
    end(g, W, sg * hl, -hw, hw, z + 0.26, z + 0.42, shade(C.ink, 0.1), { stroke: false });
    // The cab's side window, and him in it.
    side(g, W, hw, hl - 0.62, hl - 0.1, top - 0.9, top - 0.32, GLASS);
    if (o.driver && sg < 0) head(g, ...W(hl - 0.36, hw - 0.12, top - 0.66), { skin: courierSkin, cap: C.brown, left: along === 'y' ? sg > 0 : sg < 0 });
    if (!Q.detail) return;
    // The sliding door, a little open by day when he's parked.
    side(g, W, hw, hl - 1.22, hl - 0.68, z + 0.36, top - 0.18, shade(VAN, 0.1));
    face(g, [W(hl - 1.14, hw, top - 1.05), W(hl - 1.0, hw, top - 1.05)], null, { lw: 0.05, stroke: VAN_TRIM });
    // PARCELS down the side, and a goose peeking out of a box.
    board(g, along, ...W(-0.5, hw + 0.01, 0).slice(0, 2), top - 0.5, 1.15, 0.34, 'PARCELS', { board: VAN, ink: VAN_TRIM, size: 0.24, edge: 0.001, font: 'Bagel Fat One' });
    const [bx, by] = W(-0.5, hw + 0.01, 0);
    const bz = z + 0.82;
    face(g, along === 'x'
      ? [[bx - 0.18, by, bz - 0.14], [bx + 0.18, by, bz - 0.14], [bx + 0.18, by, bz + 0.14], [bx - 0.18, by, bz + 0.14]]
      : [[bx, by - 0.18, bz - 0.14], [bx, by + 0.18, bz - 0.14], [bx, by + 0.18, bz + 0.14], [bx, by - 0.18, bz + 0.14]], C.woodLight, { lw: 0.03, stroke: VAN_TRIM });
    if (Q.pxPerUnit >= 14) {
      // The goose's neck and head up out of the box, in ink and white.
      const [X, Y] = P(bx, by, bz + 0.12);
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(X - 0.02, Y + 0.02); g.quadraticCurveTo(X - 0.04, Y - 0.16, X + 0.06, Y - 0.24);
      g.strokeStyle = C.ink; g.lineWidth = 0.11; g.stroke();
      g.strokeStyle = C.white; g.lineWidth = 0.06; g.stroke();
      g.beginPath(); g.moveTo(X + 0.1, Y - 0.27); g.lineTo(X + 0.22, Y - 0.23); g.lineTo(X + 0.1, Y - 0.2);
      paint(g, C.coral, { lw: 0.02 });
    }
    // The end you can see: the windshield in front, or the back doors.
    const ue = sg * hl;
    if (sg > 0) {
      end(g, W, ue, -hw + 0.08, hw - 0.08, top - 0.9, top - 0.3, GLASS);
      if (o.driver) head(g, ...W(ue - 0.05, 0.22, top - 0.66), { skin: courierSkin, cap: C.brown, r: 0.15 });
      end(g, W, ue, -hw + 0.3, hw - 0.3, z + 0.48, z + 0.72, shade(VAN, 0.35));
    } else {
      end(g, W, ue, -hw + 0.06, 0, z + 0.44, top - 0.12, shade(VAN, 0.06));
      end(g, W, ue, 0, hw - 0.06, z + 0.44, top - 0.12, shade(VAN, 0.06));
      end(g, W, ue, -hw + 0.14, -0.08, top - 0.6, top - 0.28, GLASS);
      end(g, W, ue, 0.08, hw - 0.14, top - 0.6, top - 0.28, GLASS);
    }
    lamps(g, W, hl, hw, sg, z + 0.58, t, o);
  };
  if (o.water != null) above(ctx, W, hl, hw, o.water, t, draw);
  else draw(ctx);
  if (o.lights) headlights(ctx, x, y, z, along, sg, t);
}

// Over the turnpike at first light, a wait for the bridge, parked at the
// Center all morning, in the refuge's line at noon, at the Point in the
// afternoon, back at the Center for the evening, and off at 10:25pm,
// straight into the king tide.
export const VAN_STUCK = [OUT, 16.2];
const PARK_CENTER = [57.2, 34.6], PARK_POINT = [98.2, 33.6];
const van = vehicle('van', 'The Courier\'s van', C.brown, [
  [OUT, OFF], { until: 0.5, hide: true },
  [IN, OFF], [IN, WAIT_MAIN], { until: at(6.1), say: 'Bridge is up.' },
  [IN, BLVD - 1], [IN, SOUTH], [PARK_CENTER[0], SOUTH], PARK_CENTER, { until: at(10.75), along: 'y' },
  // Into the refuge's line, the end of it, and nowhere after two hours.
  [PARK_CENTER[0], SOUTH], [GATE + 13.2, SOUTH], { until: at(13.2), say: 'REFUGE FULL?', along: 'x', facing: -1 },
  [GATE + 13.2, NORTH], [PARK_POINT[0], NORTH], PARK_POINT, { until: at(16.6), along: 'y' },
  [PARK_POINT[0], NORTH], [IN + 0.4, NORTH], [PARK_CENTER[0], NORTH], PARK_CENTER, { until: at(22.4), along: 'y' },
  // Off the island before the tide takes the road. Nearly.
  [PARK_CENTER[0], NORTH], [OUT, NORTH], [OUT, WAIT_ISLAND], VAN_STUCK, { until: 332, say: 'Too deep.', stuck: true },
  [OUT, OFF],
], (ctx, t, p, along, sg, water) => {
  // Out on foot round the Center in the morning and at the Point after two;
  // up on the roof in the finale.
  const out = inside(t, CENTER_SPAN) || inside(t, POINT_SPAN) || (p.stuck && scene.finale > 0);
  drawVan(ctx, p.x, p.y, p.z, along, sg, t, { water, driver: !out, hazard: !!p.stuck, lights: p.moving || p.stuck });
  if (!(p.stuck && scene.finale > 0)) say(ctx, p.x, p.y, Math.max(p.z, water ?? p.z) + VAN_TOP + 0.4, p.say);
}, KING_AT + 6);

// ---------- The Courier on foot ----------
// In his brown uniform and cap, with the parcel: round the Center in the
// morning, to the lifeguards at the Point in the afternoon. Nobody's
// G. Goose.
const BROWN = C.brown;
// His cap, in brown (the engine's cap is always coral), drawn over his head.
function brownCap(ctx, hy, back) {
  ctx.beginPath();
  ctx.arc(0.02, hy - 0.02, 0.34, Math.PI, 0);
  if (!back) ctx.rect(0.14, hy - 0.06, 0.32, 0.07);
  paint(ctx, shade(BROWN, 0.12), { lw: 0.05 });
  if (Q.detail && !back) { ctx.fillStyle = C.butter; ctx.fillRect(-0.02, hy - 0.26, 0.12, 0.08); }
}
// The parcel, in his own units (facing right; the engine flips him when he
// faces left, so the label is flipped back). under: tucked under his arm.
export function parcel(g, o = {}) {
  if (o.under) g.translate(-0.3, 0.22);
  g.beginPath(); g.rect(-0.14, -0.2, 0.5, 0.34); paint(g, C.woodLight, { lw: 0.035 });
  g.beginPath(); g.moveTo(-0.14, -0.2); g.lineTo(-0.04, -0.29); g.lineTo(0.46, -0.29); g.lineTo(0.36, -0.2); g.closePath();
  paint(g, tint(C.woodLight, 0.3), { lw: 0.035 });
  if (!Q.detail) return;
  g.fillStyle = alpha(C.brown, 0.45); g.fillRect(0.02, -0.2, 0.06, 0.34);
  g.fillStyle = C.white; g.fillRect(0.13, -0.14, 0.2, 0.14);
  if (Q.pxPerUnit < 34) { g.fillStyle = C.ink; g.fillRect(0.15, -0.11, 0.15, 0.02); g.fillRect(0.15, -0.07, 0.11, 0.02); return; }
  g.save();
  g.translate(0.23, -0.07);
  if (o.flip) g.scale(-1, 1);
  g.scale(1 / 40, 1 / 40);
  g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '2.6px "Rethink Sans", sans-serif';
  g.fillText('G. GOOSE', 0, -1.4);
  g.fillText('PLUM ISLAND', 0, 1.6);
  g.restore();
}
export const courierLook = folk(7, { skin: courierSkin, hair: HAIR[1], style: 'short', top: BROWN, bottom: shade(BROWN, 0.18), dress: false, face: (ctx, hy, back) => brownCap(ctx, hy, back) });

const CENTER_SPAN = [at(6.5), at(10.6)], POINT_SPAN = [at(14), at(16.5)];
function onFoot(id, steps, span) {
  const walk = schedule(steps, { loop: LOOP, name: 'The Courier', speed: WALK });
  return {
    id, name: 'The Courier', loop: LOOP, color: C.brown,
    away: true, // in the van the rest of the day
    at: (t) => { const p = walk(t); return { ...p, z: h(p.x, p.y) }; },
    draw(ctx, t, p) {
      if (!inside(t, span)) return;
      const flip = p.dir === 'l';
      // At a door: knocking with one hand, the parcel in the other.
      const knocking = !p.moving && p.pose === 'carry' && !p.say;
      const look = {
        ...courierLook,
        hold: (g) => parcel(g, { under: p.moving, flip }),
        ...(knocking ? { arms: [2.2 + Math.sin(t * 15) * 0.3, 1.1] } : {}),
      };
      who(ctx, p.x, p.y, p.z, look, null, p, t);
      say(ctx, p.x, p.y, p.z + 2.9, p.say);
    },
  };
}
const knock = (x, y, s = 3, say = null) => [[x, y], { wait: s, pose: 'carry', say }];
const courierCenter = onFoot('courier', [
  [PARK_CENTER[0] + 1, 33.4], { until: CENTER_SPAN[0] },
  ...knock(53.4, 32.6, 3, 'G. Goose?'), // the bait shop
  ...knock(50.4, 29.6, 2), ...knock(54.6, 29.4, 2), [58.5, NORTH - 0.9], ...knock(66.2, 29.8, 3, 'G. Goose?'), // the ice cream window
  [62, 38], [62, 43.2], { wait: 5, pose: 'point', say: 'G. Goose?' },
  [62, 38], [PARK_CENTER[0] + 1, 33.4], { until: CENTER_SPAN[1] },
], CENTER_SPAN);
const courierPoint = onFoot('courier-point', [
  [PARK_POINT[0] + 1, 32.6], { until: POINT_SPAN[0] },
  [102.4, 34.6], [104.2, 40.2], { wait: 5, pose: 'point', say: 'G. Goose?' },
  [101.2, 37.6], { wait: 2, pose: 'carry', say: 'Never heard of him.' },
  [PARK_POINT[0] + 1, 32.6], { until: POINT_SPAN[1] },
], POINT_SPAN);

// ---------- Every King Tide Dave ----------
// A red pickup (nobody's brand), parked at Bob's Lobster all day facing the
// road, Dave in it with a thermos and a camera on the dash. At the king tide
// he drives out through the flood, windows down, arm out, waving, past the
// Courier's van, onto the island, and home again once the road's clear.
const TRUCK_LEN = 2.2, TRUCK_WID = 1;
const TRUCK = shade(C.red, 0.02);
const daveSkin = SKIN[1];
const DAVE_SAYS = ['Any minute now.', 'Nineteen years running.', 'Got my camera.', 'Tonight\'s the night.'];
function drawTruck(ctx, x, y, z, along, sg, t, o = {}) {
  const W = frame(x, y, along, sg), hl = TRUCK_LEN / 2, hw = TRUCK_WID / 2;
  const glass = mix(tint(C.sky, 0.25), TRUCK, 0.1);
  const bed = (g) => {
    part(g, W, -hl, -0.28, -hw, hw, z + 0.26, z + 0.92, TRUCK, { dotsL: shade(TRUCK, 0.5), dens: 0.12 });
    // Open on top: the bed floor, and a cooler in it (the Gander Cola one's on his lot).
    face(g, [W(-hl + 0.07, -hw + 0.07, z + 0.92), W(-0.35, -hw + 0.07, z + 0.92), W(-0.35, hw - 0.07, z + 0.92), W(-hl + 0.07, hw - 0.07, z + 0.92)], shade(TRUCK, 0.4), { lw: 0.025 });
    if (Q.detail) {
      part(g, W, -0.95, -0.55, -0.32, 0.12, z + 0.9, z + 1.18, C.white, { flat: true, lw: 0.03 });
      part(g, W, -0.97, -0.53, -0.34, 0.14, z + 1.18, z + 1.26, C.teal, { flat: true, lw: 0.03 });
    }
    if (sg < 0 && Q.detail) end(g, W, -hl, -hw + 0.1, hw - 0.1, z + 0.5, z + 0.78, shade(TRUCK, 0.12));
  };
  const cab = (g) => {
    part(g, W, -0.28, 0.5, -hw, hw, z + 0.26, z + 0.82, TRUCK, { dotsL: shade(TRUCK, 0.5), dens: 0.12 });
    part(g, W, -0.24, 0.42, -hw + 0.05, hw - 0.05, z + 0.82, z + 1.36, glass, { flat: true, top: tint(TRUCK, 0.06), left: shade(glass, 0.12), right: glass, lw: 0.035 });
    if (Q.detail) {
      // On the dash: the thermos and the camera.
      part(g, W, 0.3, 0.38, -0.3, -0.18, z + 0.82, z + 1.02, C.teal, { flat: true, lw: 0.02 });
      part(g, W, 0.3, 0.4, 0.05, 0.25, z + 0.82, z + 0.95, C.ink, { flat: true, lw: 0.02 });
    }
    head(g, ...W(0.05, hw - 0.18, z + 1.1), { skin: daveSkin, cap: C.navy, left: along === 'y' ? sg > 0 : sg < 0 });
    if (o.wave) armOut(g, ...W(0.12, hw + 0.02, z + 0.86), t, daveSkin);
    if (o.flash && Q.detail) {
      const k = (t * 0.8) % 1;
      if (k < 0.1) {
        const [X, Y] = P(...W(0.35, 0.15, z + 1));
        g.fillStyle = C.white; g.beginPath();
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 0.1 : 0.32; g.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); }
        g.closePath(); g.fill();
      }
    }
  };
  const hood = (g) => {
    part(g, W, 0.5, hl, -hw, hw, z + 0.26, z + 0.72, TRUCK, { dotsL: shade(TRUCK, 0.5), dens: 0.12 });
    if (sg > 0 && Q.detail) end(g, W, hl, -hw + 0.28, hw - 0.28, z + 0.36, z + 0.6, shade(C.ink, 0.1));
  };
  const draw = (g) => {
    if (Q.detail) for (const [u, v] of [[-hl + 0.4, -hw + 0.08], [hl - 0.38, -hw + 0.08], [-hl + 0.4, hw - 0.08], [hl - 0.38, hw - 0.08]]) part(g, W, u - 0.15, u + 0.15, v - 0.13, v + 0.13, z, z + 0.32, C.ink, { flat: true, lw: 0.03 });
    // Back to front, as you see it.
    for (const f of sg > 0 ? [bed, cab, hood] : [hood, cab, bed]) f(g);
    lamps(g, W, hl, hw, sg, z + 0.5, t, o);
  };
  if (o.water != null) {
    above(ctx, W, hl, hw, o.water, t, draw);
    if (o.moving) bowWave(ctx, W, hl, hw, o.water, t);
  } else draw(ctx);
  if (o.lights) headlights(ctx, x, y, z, along, sg, t);
}

const DAVE_PARK = [SHACK[0] - 2, SHACK[1] + 1];
const DRIVE_OUT = KING_AT + 4, HOME = 360;
const dave = vehicle('dave', 'Every King Tide Dave', C.red, [
  DAVE_PARK, { until: KING_AT + 4, along: 'x', facing: -1 },
  [IN, DAVE_PARK[1]], [IN, 16.6], { wait: 1.5, say: 'Every time!' },
  [IN, BLVD - 1], [IN, SOUTH], [66, SOUTH], { until: 344 },
  [IN, BLVD - 1], [IN, DAVE_PARK[1]],
], (ctx, t, p, along, sg, water) => {
  const s = wrap(t), out = s >= DRIVE_OUT && s < HOME;
  const night = nightK(t) > 0.3;
  // Parked (all day): the Turnpike draws him as a still picture (parkedDave).
  if (!daveParked(t)) drawTruck(ctx, p.x, p.y, p.z, along, sg, t, { water, moving: p.moving, wave: out && (p.moving || p.say), flash: out && water != null, lights: night && (out || p.moving) });
  // Parked all day, he'll tell you about it.
  let line = p.say;
  if (!line && !p.moving && !out) { const k = (t + 11) % 46; if (k < 4) line = DAVE_SAYS[Math.floor((t + 11) / 46) % DAVE_SAYS.length]; }
  say(ctx, p.x, p.y, Math.max(p.z, water ?? p.z) + 1.9, line);
});

// Parked in his spot, dry: nothing about the truck moves (only what he says),
// so the Turnpike, where he parks, draws it as a still picture, by day and
// with its lamps lit by night, instead of drawing it fresh every frame.
// (On first use: the land isn't worked out until something draws it.)
let daveZ = null;
const DAVE_Z = () => (daveZ ??= roadZ(...DAVE_PARK));
export function daveParked(t) {
  const p = dave.at(t);
  return !p.moving && Math.hypot(p.x - DAVE_PARK[0], p.y - DAVE_PARK[1]) < 0.05 && level(t) <= DAVE_Z() + 0.02;
}
export function parkedDave(R) {
  const [x, y] = DAVE_PARK;
  R.thing(x, y, (ctx) => drawTruck(ctx, x, y, DAVE_Z(), 'x', -1, 100), { on: (t) => daveParked(t) && !lightsOn(t) });
  R.thing(x, y, (ctx) => drawTruck(ctx, x, y, DAVE_Z(), 'x', -1, 312), { on: (t) => daveParked(t) && lightsOn(t) });
}

// ---------- Traffic ----------
// Cars in the style sheet's inks, with what people bring to a beach on the
// roof, headlamps after dark, and drivers leaning out when the line stops.
// o: { board, rack, bikes, box, kid, lean: the queue's index, lines }
function bikes(ctx, W, z) {
  // Two bikes stood on the roof, wheels along the car, a little staggered.
  [[-0.16, -0.08, C.teal], [0.14, 0.08, C.coral]].forEach(([v, du, frameInk]) => {
    ctx.beginPath();
    for (const u of [-0.3 + du, 0.3 + du]) {
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * Math.PI * 2, pt = P(...W(u + Math.cos(a) * 0.16, v, z + 0.18 + Math.sin(a) * 0.16));
        i ? ctx.lineTo(...pt) : ctx.moveTo(...pt);
      }
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(...P(...W(-0.3 + du, v, z + 0.18))); ctx.lineTo(...P(...W(-0.02 + du, v, z + 0.4))); ctx.lineTo(...P(...W(0.3 + du, v, z + 0.18)));
    ctx.moveTo(...P(...W(-0.02 + du, v, z + 0.4))); ctx.lineTo(...P(...W(0.22 + du, v, z + 0.46)));
    ctx.strokeStyle = frameInk; ctx.lineWidth = 0.06; ctx.stroke();
  });
}
const POOL = ['Is it moving?', 'We could have walked.', 'I can smell the beach.', 'Are we there yet?', 'We could try Crane.', 'It said OPEN online.', 'Is that a plover?', 'BEEP BEEP'];
function drawCar(ctx, t, p, along, sg, water, color, o = {}) {
  // Its frame faces the way it's going (sg), so the cabin, the kid at the
  // back window and the driver leaning out all turn with it.
  const { x, y, z } = p, W = frame(x, y, along, sg);
  car(ctx, x, y, z, color, along, null, t, water, { board: o.board, rack: o.rack || o.bikes, dir: sg });
  // The cabin (kit's car sets it 0.1 back from its front): near side at +0.42.
  const cab = (u, v, zz) => W(u - 0.1, v, zz);
  if (o.box) part(ctx, W, -0.55, 0.35, -0.3, 0.3, z + 1.05, z + 1.33, C.white, { flat: true, lw: 0.035, top: tint(C.white, 0.2) });
  if (!Q.detail) return;
  if (o.bikes && water == null) bikes(ctx, W, z + 1.05);
  if (o.kid) {
    // The kid in the back window, face pressed to it, every single time.
    head(ctx, ...cab(-0.34, 0.44, z + 0.84), { skin: SKIN[3], hair: HAIR[3], r: 0.13 });
    const [X, Y] = P(...cab(-0.34, 0.47, z + 0.8));
    ctx.fillStyle = SKIN[3]; ctx.beginPath(); ctx.arc(X - 0.15, Y + 0.02, 0.05, 0, Math.PI * 2); ctx.arc(X + 0.15, Y + 0.02, 0.05, 0, Math.PI * 2); ctx.fill();
  }
  let line = p.say;
  if (o.lean != null && !p.moving) {
    // Drivers in the line lean out to see if it's moving.
    const i = o.lean;
    if (Math.sin(t * 0.35 + i * 1.9) > 0.1) {
      head(ctx, ...cab(0.2, 0.62, z + 0.92), { skin: SKIN[(i * 2 + 1) % 6], hair: HAIR[(i + 2) % 8] });
      const [X, Y] = P(...cab(0.12, 0.5, z + 0.72));
      ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + 0.25, Y + 0.05); ctx.stroke();
      ctx.strokeStyle = SKIN[(i * 2 + 1) % 6]; ctx.lineWidth = 0.1; ctx.stroke();
    }
    const k = (t + i * 6.3) % 31;
    if (!line && k < 3.5) line = POOL[(Math.floor((t + i * 6.3) / 31) + i * 3) % POOL.length];
  }
  if (lightsOn(t) && p.moving) headlights(ctx, x, y, z, along, sg, t);
  say(ctx, x, y, Math.max(z, water ?? z) + (o.box ? 1.7 : 1.5), line, o.lean != null ? -0.9 : 0);
}

// Beach traffic: in all morning (the lots are full by ten), out before
// dark, waiting for the bridge in the afternoon.
const BEACH = [{ board: C.coral }, { bikes: true }, { board: C.mustard }, { rack: true }];
const beachCars = [
  [at(7.6), [LOTS.residents[0] + 4.4, 35.2], CARS[1], at(17.4)],
  [at(8.2), [LOTS.private[0] + 1.2, 35.2], CARS[2], at(16.1)],
  [at(8.8), [LOTS.private[0] + 2.8, 35.2], CARS[3], at(18)],
  [at(9.4), [LOTS.point[0] + 3.4, 33.6], CARS[4], at(18.6)],
].map(([t0, [x, y], color, t1], i) => vehicle(`beach-${i}`, 'Beach traffic', color, [
  [IN, OFF], { until: t0, hide: true },
  [IN, BLVD - 1], [IN, SOUTH], [x, SOUTH], [x, y], { until: t1, along: 'y' },
  [x, NORTH], [OUT, NORTH], [OUT, WAIT_ISLAND], { until: Math.max(t1 + 16, at(16.95)) },
  [OUT, OFF],
], (ctx, t, p, along, sg, water) => drawCar(ctx, t, p, along, sg, water, color, BEACH[i])));

// The refuge's line: the lots fill by mid-morning and the gate closes, and
// the line waits on Sunset Drive all day. (The Courier joins the end of it
// at eleven.)
export const LINE = [GATE + 2.2, GATE + 4.4, GATE + 6.6, GATE + 8.8, GATE + 11];
const LINE_LOOK = [
  [CARS[5], { board: C.white }],
  [CARS[3], { rack: true }],
  [CARS[4], { bikes: true }],
  [CARS[1], { board: C.coral }],
  [CARS[7], {}],
];
const queue = LINE.map((x, i) => vehicle(`line-${i}`, 'The line for the refuge', LINE_LOOK[i][0], [
  [IN, OFF], { until: at(9.2 + i * 0.3), hide: true },
  [IN, BLVD - 1], [IN, SOUTH], [x, SOUTH], { until: at(17.1 + i * 0.2), along: 'x' },
  [x, NORTH], [OUT, NORTH], [OUT, OFF],
], (ctx, t, p, along, sg, water) => drawCar(ctx, t, p, along, sg, water, LINE_LOOK[i][0], { ...LINE_LOOK[i][1], lean: i })));
// And the one that keeps trying: up the other side to the gate, turned
// round, back to the end of the line, and again. Coral, a roof box, and a
// kid in the back window, so you know it every time it comes back.
const tries = [];
for (let k = 0; k < 5; k++) {
  tries.push([GATE + 15.6, NORTH], [GATE + 1.4, NORTH], { wait: 4, say: k % 2 ? 'Just one car?' : 'Still full?' }, [GATE + 15.6, NORTH], [GATE + 15.2, SOUTH], { wait: 7 });
}
const trier = vehicle('trier', 'The car that keeps trying', C.coral, [
  [IN, OFF], { until: at(9.9), hide: true },
  [IN, BLVD - 1], [IN, SOUTH], [GATE + 15.2, SOUTH], { wait: 4 },
  ...tries,
  [IN - 1.4, NORTH], [OUT, NORTH], [OUT, OFF],
], (ctx, t, p, along, sg, water) => drawCar(ctx, t, p, along, sg, water, C.coral, { box: true, kid: true }));

// ---------- The greenhead man ----------
// Sunburnt, in a white tee and coral shorts. At ten a swarm of greenheads
// finds him in the Center's lot and follows him all day (his walk is in
// swarm.js, where the areas read it to step aside).
const ghLook = folk(141, { skin: mix(SKIN[0], C.coral, 0.32), hair: HAIR[3], style: 'short', top: C.white, bottom: C.coral, dress: false });
const GH_SAYS = ['Shoo!', 'Why me?', 'Get OFF.', 'Ow!', 'Is it just me?'];
// The swarm: fat dark flies with green eyes, wings flicking, round his head.
function flies(ctx, x, y, z, t) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = t * (5 + (i % 3) * 0.8) + i * 2.1, r = 0.42 + (i % 4) * 0.2;
    pts.push(P(x + Math.cos(a) * r, y + Math.sin(a * 1.1) * r * 0.7, z + 2.1 + Math.sin(a * 1.3 + i) * 0.5));
  }
  // Wings: a flick of pale grey above each, up or down.
  ctx.strokeStyle = alpha(C.greyLight, 0.8); ctx.lineWidth = 0.035; ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach(([X, Y], i) => {
    const up = Math.sin(t * 43 + i * 3.1) > 0 ? -0.09 : -0.02;
    ctx.moveTo(X - 0.01, Y - 0.02); ctx.lineTo(X - 0.1, Y + up);
    ctx.moveTo(X + 0.01, Y - 0.02); ctx.lineTo(X + 0.08, Y + up);
  });
  ctx.stroke();
  ctx.fillStyle = C.black;
  ctx.beginPath();
  for (const [X, Y] of pts) { ctx.moveTo(X + 0.075, Y); ctx.ellipse(X, Y, 0.075, 0.045, 0, 0, Math.PI * 2); }
  ctx.fill();
  // The green heads they're named for.
  ctx.fillStyle = C.leaf;
  ctx.beginPath();
  for (const [X, Y] of pts) { ctx.moveTo(X + 0.1, Y - 0.005); ctx.arc(X + 0.06, Y - 0.005, 0.04, 0, Math.PI * 2); }
  ctx.fill();
}
const greenheadMan = {
  id: 'greenhead', name: 'The greenhead man', loop: LOOP, color: C.coral,
  away: true, // in his car either side of his day
  at: (t) => { const p = ghWalk(t); return { ...p, z: h(p.x, p.y) }; },
  draw(ctx, t, p) {
    if (!inside(t, GH)) return;
    let pose = p.moving ? (p.speed > 2 ? 'run' : 'walk') : p.pose || 'stand';
    let dir = p.dir, back = p.back, arms = null;
    // Running: both arms going. Walking: a swat now and then.
    if (p.moving && p.speed > 2) arms = [Math.PI - 0.5 + Math.sin(t * 12) * 0.6, -Math.PI + 0.6 + Math.cos(t * 12) * 0.6];
    else if (p.moving && Math.sin(t * 1.3) > 0.4) arms = [Math.PI - 0.6 + Math.sin(t * 14) * 0.5, Math.sin(t * 7) * 0.45];
    // At sunset he turns to the marsh with everyone else, still swatting.
    if (!p.moving && sunsetWatch(t)) { pose = 'stand'; dir = 'r'; back = true; if (Math.sin(t * 0.9) > 0.5) arms = [Math.PI - 0.5 + Math.sin(t * 12) * 0.4, -0.15]; }
    who(ctx, p.x, p.y, p.z, arms ? { ...ghLook, arms } : ghLook, null, { ...p, pose, dir, back }, t);
    if (!Q.detail) return;
    flies(ctx, p.x, p.y, p.z, t);
    let line = p.say;
    if (!line) { const k = (t + 5) % 23; if (k < 2.4) line = GH_SAYS[Math.floor((t + 5) / 23) % GH_SAYS.length]; }
    say(ctx, p.x, p.y, p.z + 3.1, line);
  },
};

// ---------- The sunbather ----------
// A local figure (the owner's): tan, white hair, sunglasses, red shorts and
// wired headphones. He walks onto the island over the turnpike every
// morning, lies on the Center's beach all day and walks home at five. Tap
// him and he answers (sunbatherPoke, the Center's).
export const TOWEL = [63.2, 46.6];
const SHOULDER = PIKE - 0.95; // the turnpike's edge on the Pink House side (Dave's cooler is on the other)
const sunSkin = mix(SKIN[2], SKIN[1], 0.35);
const sunLook = folk(77, {
  // (Bare legs: the kit colors a whole leg with bottom, so the shorts are worn.)
  skin: sunSkin, hair: mix(C.white, C.greyLight, 0.3), style: 'short', top: sunSkin, bottom: sunSkin, dress: false,
  // Sunglasses, and an earbud.
  face: (ctx, hy, back) => {
    // From behind: the black wire down from his ear, so the white hair
    // isn't just a ball.
    if (back) {
      // His tan neck and ears under it.
      ctx.beginPath(); ctx.arc(0.02, hy, 0.31, 0.15 * Math.PI, 0.85 * Math.PI); ctx.closePath();
      ctx.fillStyle = sunSkin; ctx.fill();
      ctx.beginPath(); ctx.arc(-0.29, hy + 0.04, 0.06, 0, Math.PI * 2); ctx.arc(0.33, hy + 0.04, 0.06, 0, Math.PI * 2);
      ctx.fill();
      if (!Q.detail) return;
      ctx.beginPath(); ctx.arc(0.27, hy + 0.06, 0.05, 0, Math.PI * 2);
      ctx.fillStyle = C.ink; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.27, hy + 0.08); ctx.quadraticCurveTo(0.34, hy + 0.35, 0.22, hy + 0.55);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.roundRect(0.03, hy - 0.04, 0.29, 0.11, 0.04);
    ctx.fillStyle = C.ink; ctx.fill();
    if (!Q.detail) return;
    ctx.beginPath(); ctx.arc(-0.1, hy + 0.08, 0.05, 0, Math.PI * 2);
    ctx.fillStyle = C.ink; ctx.fill();
  },
  // Red shorts, to mid-thigh; and the black wire, from the ear down to the
  // phone in his pocket.
  wear: (ctx, b, t) => {
    ctx.beginPath();
    ctx.roundRect(-0.31, b.hipY - 0.1, 0.62, 0.42, 0.06);
    paint(ctx, C.red, { lw: 0.04 });
    if (!Q.detail || b.back) return;
    ctx.beginPath();
    ctx.moveTo(-0.1, b.top - 0.18);
    ctx.quadraticCurveTo(-0.2 + Math.sin(t * 2) * 0.03, b.shoulderY + 0.3, -0.12, b.hipY - 0.02);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
    ctx.fillStyle = C.ink; ctx.fillRect(-0.2, b.hipY - 0.04, 0.14, 0.1);
  },
});
const SUN_IN = at(6.6), SUN_UP = at(17);
const sunWalk = schedule([
  [SHOULDER, OFF], { until: SUN_IN },
  [SHOULDER, BLVD - 1.6], [PIKE, BLVD + 1.4], [PIKE, 43.2], [TOWEL[0] - 0.4, TOWEL[1] - 0.2],
  [...TOWEL], { until: SUN_UP, pose: 'lie' },
  [TOWEL[0] - 0.4, TOWEL[1] - 0.2], { wait: 3, pose: 'stand', say: 'Time to go to Market Basket.' },
  [PIKE, 43.2], [PIKE, BLVD + 1.4], [SHOULDER, BLVD - 1.6],
], { loop: LOOP, name: 'The sunbather', speed: WALK });
// While he's lying on the beach (and while the poke's for him).
export const sunbathing = (t) => { const p = sunWalk(t); return !p.moving && p.pose === 'lie'; };
let sunPoke = null;
const towelAt = (ctx, z) => {
  const x = TOWEL[0] - 0.28, y = TOWEL[1] + 0.28, a = 0.75, b = 0.4; // (under him: he lies along the screen)
  face(ctx, [[x - a - b, y + a - b, z + 0.02], [x + a - b, y - a - b, z + 0.02], [x + a + b, y - a + b, z + 0.02], [x - a + b, y + a + b, z + 0.02]], C.mustard, { lw: 0.03 });
  if (Q.detail) face(ctx, [[x + 0.3 - b, y - 0.3 - b, z + 0.02], [x + 0.42 - b, y - 0.42 - b, z + 0.02], [x + 0.42 + b, y - 0.42 + b, z + 0.02], [x + 0.3 + b, y - 0.3 + b, z + 0.02]], C.red, { lw: 0 });
};
const sunbather = {
  id: 'sunbather', name: 'The sunbather', loop: LOOP, color: C.red,
  away: true, // at home the rest of the day, past the map's back edge
  at: (t) => { const p = sunWalk(t); return { ...p, z: roadZ(p.x, p.y) }; },
  draw(ctx, t, p) {
    const s = wrap(t);
    if (s < SUN_IN || p.y < -1) return;
    const lying = !p.moving && p.pose === 'lie';
    if (lying) {
      towelAt(ctx, p.z);
      // Tapped: he props up on an elbow for a second, then back down.
      const k = sunPoke ? sunPoke.k() : 0;
      if (k > 0.05) {
        who(ctx, p.x, p.y, p.z, { ...sunLook, pose: 'sit', arms: [1.6, 0.4] }, null, { ...p, pose: 'sit', dir: 'l' }, t);
        return;
      }
      who(ctx, p.x, p.y, p.z, sunLook, null, { ...p, pose: 'lie', dir: 'r' }, t);
      return;
    }
    // Walking, nodding along to whatever's on.
    const nod = Q.detail ? Math.sin(t * 7) * 0.04 : 0;
    who(ctx, p.x, p.y, p.z + nod, sunLook, null, { ...p, pose: p.moving ? 'walk' : 'stand' }, t);
    say(ctx, p.x, p.y, p.z + 2.9, p.say);
  },
};
// His poke, on the Center's beach (the Center calls this).
export function sunbatherPoke(R) {
  sunPoke = R.poke({
    id: 'sunbather', at: [TOWEL[0], TOWEL[1], h(...TOWEL) + 0.4], r: 1, hold: 2.5, sound: 'pop', when: sunbathing,
    say: ['Can\'t hear you. Headphones.', 'Time to go to Market Basket.', 'Working on the tan.'],
  });
  return sunPoke;
}

export const walkers = [van, courierCenter, courierPoint, dave, ...beachCars, ...queue, trier, greenheadMan, sunbather];
