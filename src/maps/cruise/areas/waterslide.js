// The Waterslide. The stern end of the Sun Deck, open air: the Corkscrew (a
// tower with stairs up to a platform, the tube corkscrewing down to a splash
// pool), the ship's big red funnel with its crest (a knife and fork, crossed)
// and its smoke, mini golf with a windmill, a lifeboat on the far rail and the
// ship's flag on the stern rail. The lift comes up in its little house by the
// far rail. Keep the id: it's in links and saves.
//
// The running gag, once a minute: a big man goes down the Corkscrew and gets
// stuck where the tube opens out, feet kicking. The queue grows up the stairs
// and down the deck. The lifeguard pokes him with a pool noodle until he
// shoots out into the splash pool, and then the whole queue goes, one a
// second, and he gets back on the end of it.
//
// Units are the area's own: x from the stern (0) to the Pool (16), y from the
// far rail (0) to the cut side (16). People on the day's clock walk between
// the lift (12, 1.4) and the Pool's rail at (16, 8), so that strip stays clear.
import {
  C, Q, box, rect, disc, cylinder, face, poly, paint, person, folk, speech, label,
  shade, tint, mix, alpha, dots, SKIN, HAIR,
} from '../../../engine/art.js';
import { particles, pulse, clamp } from '../../../engine/actors.js';
import { deck, outline, lifeboat } from '../ship.js';
import { bucket, cocktail, board, lettering, gull, P, CREW_LOOK, sighting } from '../kit.js';
import { INK, MAT, green, queasy, iguana, chase, chaseOpen } from '../style.js';

// ---------- The layout ----------
// The tower: its body, the platform on top, and the two flights of stairs
// on its two sides you can see (B down its right side, A along its front).
const TW0 = [2, 4], TW1 = [5, 7], TOP = 8.5;
const CANOPY = 12.2; // the platform's sun canopy (its edge)
const STEP = 0.53; // every step is this high: 8 to a flight, 4.25 a flight
const LAND = 4.25; // the landing between the flights, at the front right corner
// The tube: a corkscrew round a pole, closed at the top and open (a flume)
// for its last turn and a bit, then a chute into the splash pool.
const HX = 7.9, HY = 8.2, HR = 1.35;
const MOUTH = [5.1, 6.3, 8.35];
const TH0 = Math.atan2(MOUTH[1] - HY, MOUTH[0] - HX);
const TH1 = 4.5 * Math.PI, Z0 = 8.1, Z1 = 1.0;
const THC = 2.08 * Math.PI; // where the tube opens out (and where he sticks)
const CHUTE = [6.3, 10.1, 0.5];
const TUBE = INK.sunYellow, TUBE_W = 0.85;
const BACK_D = HX + HY - HR, FRONT_D = HX + HY + HR;
// The splash pool, sunk in the deck.
const SX0 = 2, SY0 = 9, SX1 = 7, SY1 = 13, WZ = -0.3, BED = -1.2;
// The funnel: round, raked back toward the stern, on a little white plinth.
// (Clear of x 12, where everyone walks to and from the lift.)
const FX = 9.5, FY = 4.3, FR = 1.75, FZ0 = 0.8, FZ1 = 11, RAKE = 0.45;
// The lifeguard's high chair.
const LGC = [9.4, 14.2];
// The slide attendant, up on the platform.
const ATT = [2.1, 5.9];

// The gag runs on a one-minute cycle; its beats, in seconds into it.
const CYCLE = 60;
const N = 16; // riders who turn up to queue each minute
const SP = 1.25; // room each person takes in the queue
const ARRIVE = (k) => 1 + 2 * k;
const GO = (k) => 43 + 0.95 * k; // once he's out, one a second
const IN_SPEED = 1.8, OUT_SPEED = 1.7;
const STUCK_AT = 6, POP = 40.5, SPLASH = 42.1;
const cyc = (t) => ((t % CYCLE) + CYCLE) % CYCLE;

// A face at k green, in tenths (so the colour mixes stay few).
const qz = (skin, k) => queasy(skin, Math.round(k * 10) / 10);
const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---------- Paths ----------
// A polyline with arc length: at(s) gives the point s along it and the way
// it's heading there.
function polyline(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    acc.push(acc[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0)));
  }
  const len = acc[acc.length - 1];
  const at = (s) => {
    s = clamp(s, 0, len);
    let i = 1;
    while (i < pts.length - 1 && acc[i] < s) i++;
    const a = pts[i - 1], b = pts[i];
    const k = (s - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
    return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), z: lerp(a[2] || 0, b[2] || 0, k), tx: b[0] - a[0], ty: b[1] - a[1] };
  };
  return { at, len, acc };
}

// The queue, from the mouth of the tube back down the stairs, along the
// stern rail and out along the front of the deck to the Pool: people join
// at the far end and walk up it to their place.
const QUEUE = polyline([
  [4.7, 6.2, TOP], [4.6, 4.2, TOP], [5.6, 3.5, TOP], [5.6, 3.8, TOP], // the platform, the top landing
  [5.6, 7.1, LAND], [5.4, 7.6, LAND], [5.1, 7.6, LAND], // flight B, the landing
  [1.0, 7.6, 0], [0.9, 8.5, 0], // flight A
  [0.9, 15.0, 0], [16.8, 15.0, 0], // along the stern rail, and in from the Pool
]);
const JOIN = QUEUE.len;
const DECK_S = QUEUE.acc[9]; // where the stern rail's stretch ends (the corner at y 15)

// The tube, sampled: straight out of the mouth, the corkscrew, the chute.
const TUBE_PTS = (() => {
  const pts = [];
  const start = [HX + HR * Math.cos(TH0), HY + HR * Math.sin(TH0), Z0];
  for (let i = 0; i < 6; i++) { const [x, y, z] = lerp3(MOUTH, start, i / 6); pts.push({ x, y, z, front: false, open: false, th: null }); }
  const n = Math.ceil((TH1 - TH0) / 0.08);
  for (let i = 0; i <= n; i++) {
    const th = TH0 + ((TH1 - TH0) * i) / n;
    const x = HX + HR * Math.cos(th), y = HY + HR * Math.sin(th);
    pts.push({ x, y, z: lerp(Z0, Z1, (th - TH0) / (TH1 - TH0)), front: Math.cos(th) + Math.sin(th) > -0.05, open: th >= THC, th });
  }
  const end = pts[pts.length - 1];
  for (let i = 1; i <= 5; i++) { const [x, y, z] = lerp3([end.x, end.y, end.z], CHUTE, i / 5); pts.push({ x, y, z, front: true, open: true, th: null }); }
  let s = 0;
  pts.forEach((p, i) => { if (i) s += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y, p.z - pts[i - 1].z); p.s = s; });
  return pts;
})();
const TUBE_LEN = TUBE_PTS[TUBE_PTS.length - 1].s;
const sAtTheta = (th) => TUBE_PTS.find((p) => p.th != null && p.th >= th).s;
const U_OPEN = sAtTheta(THC) / TUBE_LEN;
const U_STUCK = sAtTheta(1.97 * Math.PI) / TUBE_LEN;
// A point u (0 to 1) along the tube, and which way is downstream on screen.
function tubeAt(u) {
  const s = clamp(u) * TUBE_LEN;
  let i = 1;
  while (i < TUBE_PTS.length - 1 && TUBE_PTS[i].s < s) i++;
  const a = TUBE_PTS[i - 1], b = TUBE_PTS[i];
  const k = (s - a.s) / (b.s - a.s || 1);
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), front: b.front, open: b.open, tx: b.x - a.x, ty: b.y - a.y, tz: b.z - a.z };
}
// Runs of the tube in one piece: front or back of the corkscrew, open or not.
const RUNS = (() => {
  const runs = [];
  let cur = null;
  for (const p of TUBE_PTS) {
    if (!cur || cur.front !== p.front || cur.open !== p.open) {
      if (cur) cur.pts.push(p); // overlap one point so the runs join up
      cur = { front: p.front, open: p.open, pts: cur ? [cur.pts[cur.pts.length - 1], p] : [p] };
      runs.push(cur);
    } else cur.pts.push(p);
  }
  return runs;
})();

// ---------- The crowd ----------
// Everyone in the gag, worked out together for a moment (so nobody walks
// through the person ahead). Riders queue, ride, splash, swim and leave; the
// big man gets stuck, pops out, and rejoins the end.
const RIDERS = Array.from({ length: N }, (_, k) => {
  const f = folk(200 + k * 7);
  const shirtless = k % 3 !== 1;
  const kid = k === 3 || k === 9 || k === 12;
  return {
    look: {
      ...f,
      top: shirtless ? f.skin : f.top,
      bottom: [INK.flamingo, C.navy, INK.sunYellow, C.teal, C.coral, C.sky][k % 6],
      dress: false,
      hat: ['none', 'sun', 'none', 'cap', 'none', 'none', 'sun', 'none'][k % 8],
      scale: kid ? 0.72 : 1,
    },
    sick: k % 2 ? 92 + 3 * k : null,
    drink: k === 4 || k === 10,
    spl: [3.2 + (k % 4) * 0.8, 10.1 + ((k * 3) % 5) * 0.45],
    exit: [4.6 + (k % 4) * 0.65, 12.75], // (out past the queue sign's posts)
  };
});
// Things said in the queue while he's stuck: [rider, from, to, line].
const LINES = [
  [2, 13, 16, 'Any day now!'],
  [6, 19, 22, 'Is this the buffet queue?'],
  [9, 26, 29, 'I can see his feet.'],
  [13, 36, 39, 'I paid for this?'],
  [15, 42.3, 44.8, 'Hey!'],
];
const BIG_LINES = [[0.2, 2.8, 'Here goes nothing!'], [8, 11, "I'm fine!"], [15, 18, 'Little help?'], [22, 25, 'Day four of the buffet.'], [31, 34, 'Anyone got butter?'], [40.5, 42.4, 'Wheeee!']];

const gone = (j, c) => clamp((c - GO(j)) / 0.6);
function queuePos(s, ahead) {
  const p = QUEUE.at(s);
  // Facing up the queue (toward the mouth).
  const dX = -(p.tx - p.ty), dY = -(p.tx + p.ty);
  const fade = clamp((16.8 - p.x) / 1.5);
  return { x: p.x, y: p.y, z: p.z, dir: dX >= 0 ? 'r' : 'l', back: dY < -0.01, a: fade, s, ahead };
}
// A rider k, c seconds into the cycle (the tail end of the last cycle's ride
// before they turn up again).
function riderAt(k, c) {
  const R = RIDERS[k];
  if (c >= ARRIVE(k) && c < GO(k)) {
    let before = 0;
    for (let j = 0; j < k; j++) before += gone(j, c);
    const slot = SP * (k - before);
    const walk = JOIN - IN_SPEED * (c - ARRIVE(k));
    const s = Math.max(slot, walk);
    const p = queuePos(s);
    p.kind = 'queue';
    p.moving = walk > slot + 0.01 || (before % 1 > 0.01 && before % 1 < 0.99);
    return p;
  }
  const r = (c >= GO(k) ? c : c + CYCLE) - GO(k);
  return ride(r, R.spl, R.exit, false);
}
// Riding the tube, r seconds after stepping up to it.
function ride(r, spl, exit, big) {
  const seat = { x: 5.0, y: 6.3, z: TOP };
  if (r < 0.5) return { ...seat, kind: 'seat', dir: 'r' };
  if (r < 1.7) return inTube(U_OPEN * Math.pow((r - 0.5) / 1.2, 1.5), 'bulge', big);
  if (r < 2.3) return inTube(U_OPEN + (1 - U_OPEN) * ((r - 1.7) / 0.6), 'flume', big);
  return afterChute(r - 2.3, spl, exit, big);
}
function inTube(u, kind, big) {
  const p = tubeAt(u);
  const d = p.front ? FRONT_D + 0.03 : BACK_D + 0.03;
  const dX = p.tx - p.ty;
  return { x: p.x, y: p.y, z: p.z, kind, big, u, dir: dX >= 0 ? 'r' : 'l', ahead: d - (p.x + p.y) };
}
// Out of the chute: through the air, splash, swim, climb out and walk off.
function afterChute(r, spl, exit, big) {
  const fly = big ? 0.8 : 0.5;
  if (r < fly) {
    const k = r / fly;
    const [x, y, z] = lerp3(CHUTE, [spl[0], spl[1], WZ], k);
    return { x, y, z: z + (big ? 2.2 : 1.1) * Math.sin(Math.PI * k), kind: 'fly', big, dir: 'l' };
  }
  const sw = r - fly, swimT = big ? 4.9 : 2.4;
  if (sw < swimT) {
    const k = sw / swimT;
    return { x: lerp(spl[0], exit[0], k), y: lerp(spl[1], exit[1], k), z: WZ, kind: 'swim', big, dir: exit[0] > spl[0] ? 'r' : 'l', back: false };
  }
  const cl = sw - swimT;
  if (cl < 0.5) return { x: exit[0], y: lerp(exit[1], 13.6, cl / 0.5), z: lerp(WZ - 0.5, 0, cl / 0.5), kind: 'walk', big, dir: 'l' };
  if (big) return null;
  const out = polyline([[exit[0], 13.6], [exit[0] + 0.4, 15.6], [16.8, 15.6]]);
  const s = (cl - 0.5) * OUT_SPEED;
  if (s >= out.len) return { hidden: true, x: 0, y: 0 };
  const p = out.at(s);
  return { x: p.x, y: p.y, z: 0, kind: 'walk', dir: p.tx - p.ty >= 0 ? 'r' : 'l', back: p.tx + p.ty < 0, a: clamp((16.8 - p.x) / 1.5), moving: true };
}
// The big man.
const BIG_SPL = [4.1, 10.9], BIG_OUT = [2.5, 12.6];
const BIG_BACK = polyline([[2.5, 13.6], [1.95, 14.35], [1.2, 15.0]]);
function bigAt(c, riders) {
  if (c < 0.5) return { ...queuePos(0), kind: 'queue' };
  if (c < 3) return { x: 5.0, y: 6.3, z: TOP, kind: 'seat', big: true, dir: 'r' };
  if (c < STUCK_AT) { const k = (c - 3) / (STUCK_AT - 3); return inTube(U_STUCK * (1 - (1 - k) * (1 - k)), 'bulge', true); }
  if (c < POP) return { ...inTube(U_STUCK, 'stuck', true), kind: 'stuck' };
  if (c < POP + 0.8) return inTube(U_STUCK + (1 - U_STUCK) * ((c - POP) / 0.8), 'flume', true);
  const out = afterChute(c - POP - 0.8, BIG_SPL, BIG_OUT, true);
  if (out) return out;
  // Out of the pool and round the end of the rope (not over it) to the
  // corner of the queue.
  const back = c - (POP + 0.8 + 0.8 + 4.9 + 0.5);
  if (back < BIG_BACK.len / 2.2) {
    const p = BIG_BACK.at(back * 2.2);
    return { x: p.x, y: p.y, z: 0, kind: 'walk', dir: p.tx - p.ty >= 0 ? 'r' : 'l', back: p.tx + p.ty < 0 };
  }
  // On the end of the queue again, and up it as it goes.
  let left = N;
  for (let j = 0; j < N; j++) left -= gone(j, c);
  const last = riders[N - 1];
  const behind = last.kind === 'queue' ? last.s + SP : 0;
  const walk = DECK_S + 0.3 - 2.2 * (back - BIG_BACK.len / 2.2);
  const s = Math.max(SP * left, walk, behind);
  const p = queuePos(s);
  p.kind = 'queue';
  p.moving = walk >= Math.max(SP * left, behind) || (left % 1 > 0.01 && left % 1 < 0.99);
  return p;
}
let memoT = NaN, memo = null;
function crowd(t) {
  if (t === memoT) return memo;
  const c = cyc(t);
  const riders = RIDERS.map((_, k) => riderAt(k, c));
  memo = { c, riders, big: bigAt(c, riders) };
  memoT = t;
  return memo;
}
const say = (list, c) => { for (const [a, b, s] of list) if (c >= a && c < b) return s; return null; };

// ---------- The lifeguard ----------
// Up on his chair; at 24 seconds down he gets, over to the slide (round his
// chair and the iceberg, not through them), and pokes.
const POKE = [9.5, 9.8];
const FOOT = [10.15, 14.75]; // where he lands, beside his chair
const GUARD_WALK = polyline([FOOT, [9.95, 12.6], POKE]);
function lifeguardAt(t) {
  const c = cyc(t);
  const seat = { x: LGC[0], y: LGC[1], z: 1.45, pose: 'sit', dir: 'l', hold: 'up' };
  const walk = (s, back) => {
    const p = GUARD_WALK.at(s);
    const tx = back ? -p.tx : p.tx, ty = back ? -p.ty : p.ty;
    return { x: p.x, y: p.y, z: 0, pose: 'walk', dir: tx - ty >= 0 ? 'r' : 'l', back: tx + ty < 0, hold: 'carry' };
  };
  const out = 2.8, home = 2.6, L = GUARD_WALK.len;
  if (c < 24 || c >= 44.6) return seat;
  if (c < 24.6) { const k = (c - 24) / 0.6; return { x: lerp(LGC[0], FOOT[0], k), y: lerp(LGC[1], FOOT[1], k), z: 1.4 * (1 - k), pose: 'jump', dir: 'l', hold: 'carry' }; }
  if (c < 24.6 + out) return walk((L * (c - 24.6)) / out, false);
  if (c < POP) return { x: POKE[0], y: POKE[1], z: 0, pose: 'stand', dir: 'l', back: true, hold: 'poke' };
  if (c < 41.4) return { x: POKE[0] + 0.2 * (c - POP), y: POKE[1] + 0.3 * (c - POP), z: 0, pose: 'jump', dir: 'l', hold: 'carry' };
  const s0 = Math.hypot(0.18, 0.27);
  if (c < 41.4 + home) return walk(L - s0 - ((L - s0) * (c - 41.4)) / home, true);
  const k = (c - 41.4 - home) / (44.6 - 41.4 - home);
  return { x: lerp(FOOT[0], LGC[0], k), y: lerp(FOOT[1], LGC[1], k), z: 1.4 * k, pose: 'jump', dir: 'l', hold: 'carry' };
}

// ---------- Drawing helpers ----------
// A stroke along some tube points, nudged up or down the screen by dy.
function tubePath(ctx, pts, dy = 0) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(p.x, p.y, p.z); i ? ctx.lineTo(X, Y + dy) : ctx.moveTo(X, Y + dy); });
}
function tubeRun(ctx, run) {
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  tubePath(ctx, run.pts);
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = TUBE_W + 0.12; ctx.stroke(); }
  ctx.strokeStyle = TUBE; ctx.lineWidth = TUBE_W; ctx.stroke();
  if (Q.detail) {
    tubePath(ctx, run.pts, 0.22);
    ctx.strokeStyle = dots(shade(TUBE, 0.55), 0.3); ctx.lineWidth = 0.34; ctx.stroke();
  }
  if (run.open) {
    // The inside of the flume, wet.
    tubePath(ctx, run.pts, -0.14);
    ctx.strokeStyle = tint(C.water, 0.4); ctx.lineWidth = TUBE_W * 0.46; ctx.stroke();
    tubePath(ctx, run.pts, -0.36);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
  } else {
    tubePath(ctx, run.pts, -0.2);
    ctx.strokeStyle = tint(TUBE, 0.55); ctx.lineWidth = 0.14; ctx.stroke();
    tubePath(ctx, run.pts, 0.06);
    ctx.strokeStyle = INK.flamingo; ctx.lineWidth = 0.1; ctx.stroke();
    // Where the sections bolt together.
    if (Q.detail) {
      let next = run.pts[0].s + 0.6;
      for (let i = 1; i < run.pts.length; i++) {
        const p = run.pts[i];
        if (p.s < next) continue;
        next = p.s + 1.3;
        const q = run.pts[i - 1];
        const [a, b] = P(q.x, q.y, q.z), [e, f] = P(p.x, p.y, p.z);
        const l = Math.hypot(e - a, f - b) || 1, nx = -(f - b) / l, ny = (e - a) / l;
        ctx.beginPath(); ctx.moveTo(e + nx * TUBE_W / 2, f + ny * TUBE_W / 2); ctx.lineTo(e - nx * TUBE_W / 2, f - ny * TUBE_W / 2);
        ctx.strokeStyle = shade(TUBE, 0.35); ctx.lineWidth = 0.04; ctx.stroke();
      }
    }
  }
}
// A post and rail fence along a line, with posts where you say.
function railing(ctx, a, b, posts, h = 1.1, color = C.white) {
  ctx.lineCap = 'round';
  for (const k of posts) {
    const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k), z = lerp(a[2], b[2], k);
    const [X, Y] = P(x, y, z), [, Y2] = P(x, y, z + h);
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y2);
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11; ctx.stroke(); }
    ctx.strokeStyle = color; ctx.lineWidth = 0.06; ctx.stroke();
  }
  const [A, B] = P(a[0], a[1], a[2] + h), [E, F] = P(b[0], b[1], b[2] + h);
  ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F);
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = 0.09; ctx.stroke();
}
// A line in the world, drawn thick, with an ink edge.
function stick(ctx, a, b, w, color, cap = 'round') {
  const [A, B] = P(...a), [E, F] = P(...b);
  ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F);
  ctx.lineCap = cap;
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.08; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
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
// The splash pool's opening in the deck, as a path (to see its inside through).
function splashHole(ctx) {
  poly(ctx, [[SX0, SY0, 0], [SX1, SY0, 0], [SX1, SY1, 0], [SX0, SY1, 0]]);
}
// A lifebuoy flat on the stern rail (the plane x = 0).
function sternBuoy(ctx, y, z, r = 0.38) {
  const [X, Y] = P(0.05, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.transform(1, -0.5, 0, 1, 0, 0);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, r, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
    ctx.arc(0, 0, r * 0.55, ((i + 1) * Math.PI) / 2, (i * Math.PI) / 2, true);
    ctx.closePath();
    paint(ctx, i % 2 ? C.white : INK.funnelRed, { lw: 0.03 });
  }
  ctx.restore();
}
// The ship's crest: a knife and fork, crossed, on a disc. Drawn facing the
// viewer, centred on screen point (X, Y), s across.
function crest(ctx, X, Y, s, ground = C.white, ink = INK.funnelRed) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.6, 0, 0, Math.PI * 2);
  paint(ctx, ground, { lw: 0.05 });
  if (Q.detail) {
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.47, s * 0.52, 0, 0, Math.PI * 2);
    ctx.strokeStyle = ink; ctx.lineWidth = s * 0.04; ctx.stroke();
    ctx.lineCap = 'round';
    ctx.fillStyle = ink; ctx.strokeStyle = ink;
    // The knife.
    ctx.save(); ctx.rotate(0.6);
    ctx.lineWidth = s * 0.07;
    ctx.beginPath(); ctx.moveTo(0, s * 0.36); ctx.lineTo(0, s * 0.08); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.05, s * 0.08); ctx.lineTo(-s * 0.05, -s * 0.36); ctx.quadraticCurveTo(s * 0.09, -s * 0.2, s * 0.05, s * 0.08); ctx.closePath(); ctx.fill();
    ctx.restore();
    // The fork.
    ctx.save(); ctx.rotate(-0.6);
    ctx.lineWidth = s * 0.07;
    ctx.beginPath(); ctx.moveTo(0, s * 0.36); ctx.lineTo(0, -s * 0.1); ctx.stroke();
    ctx.lineWidth = s * 0.04;
    for (const dx of [-0.08, 0, 0.08]) { ctx.beginPath(); ctx.moveTo(dx * s, -s * 0.1); ctx.lineTo(dx * s, -s * 0.36); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-0.08 * s, -s * 0.1); ctx.quadraticCurveTo(0, s * 0.02, 0.08 * s, -s * 0.1); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
// A flip-flop lying flat at (x, y, z), turned by a (radians), len long.
function flipflop(ctx, x, y, z, a, len, sole = INK.sunYellow, strap = INK.flamingo) {
  const c = Math.cos(a), s = Math.sin(a), w = len * 0.36;
  const pt = (u, v) => [x + c * u - s * v, y + s * u + c * v, z];
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const k = i / n, u = (k - 0.5) * len, v = w * (0.42 + 0.58 * Math.sin(Math.PI * k)) * (k < 0.5 ? 0.85 : 1);
    const [X, Y] = P(...pt(u, v));
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  for (let i = n; i >= 0; i--) {
    const k = i / n, u = (k - 0.5) * len, v = -w * (0.42 + 0.58 * Math.sin(Math.PI * k)) * (k < 0.5 ? 0.85 : 1);
    const [X, Y] = P(...pt(u, v));
    ctx.lineTo(X, Y);
  }
  ctx.closePath();
  paint(ctx, sole, { lw: 0.025 });
  // The strap: a V from the toe post to both sides.
  const [tX, tY] = P(...pt(len * 0.28, 0)), [lX, lY] = P(...pt(-len * 0.02, w * 0.9)), [rX, rY] = P(...pt(-len * 0.02, -w * 0.9));
  ctx.beginPath(); ctx.moveTo(lX, lY - 0.04); ctx.lineTo(tX, tY - 0.1); ctx.lineTo(rX, rY - 0.04);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.strokeStyle = strap; ctx.lineWidth = 0.06; ctx.stroke();
}
// A dropped wristband: a little loop on the floor.
function wristband(ctx, x, y, z, color) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath(); ctx.ellipse(X, Y, 0.2, 0.1, 0.2, 0, Math.PI * 2);
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = 0.06; ctx.stroke();
  ctx.fillStyle = C.white; ctx.fillRect(X + 0.12, Y - 0.05, 0.07, 0.06);
}
// An inflatable crocodile on the water at (x, y, z), its snout toward a
// (radians, in the deck's plane): lime vinyl, bumps down its back, goggly
// eyes, a grin of white teeth, and a shine.
function croc(ctx, x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const pt = (u, v, h = 0) => P(x + c * u - s * v, y + s * u + c * v, z + h);
  const half = (u) => (u < -0.55 ? 0.22 * (u + 0.98) / 0.43 : u < 0.3 ? 0.3 : u < 0.5 ? 0.24 : 0.24 - (u - 0.5) * 0.2);
  const outline = (h) => {
    ctx.beginPath();
    const n = 16;
    for (let i = 0; i <= n; i++) { const u = -0.98 + (1.96 * i) / n; const [X, Y] = pt(u, half(u), h); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    for (let i = n; i >= 0; i--) { const u = -0.98 + (1.96 * i) / n; const [X, Y] = pt(u, -half(u), h); ctx.lineTo(X, Y); }
    ctx.closePath();
  };
  const G = INK.queasyGreen;
  // A ripple round it, then its puffed-up side and its top.
  if (Q.detail) {
    const [X, Y] = pt(0, 0, -0.02);
    ctx.beginPath(); ctx.ellipse(X, Y, 1.3, 0.55, 0, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(C.white, 0.7); ctx.lineWidth = 0.05; ctx.stroke();
  }
  outline(0);
  paint(ctx, shade(G, 0.3), { lw: 0.035 });
  // Stubby legs, out at the sides.
  for (const [u, v] of [[-0.35, 0.36], [0.3, 0.33], [-0.35, -0.36], [0.3, -0.33]]) {
    const [X, Y] = pt(u, v, 0.12);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.12, 0.08, 0, 0, Math.PI * 2);
    paint(ctx, G, { lw: 0.025 });
  }
  outline(0.22);
  paint(ctx, G, { lw: 0.035 });
  // Bumps down its back.
  for (let i = 0; i < 6; i++) {
    const u = -0.75 + i * 0.2;
    const [X, Y] = pt(u, 0, 0.26);
    ctx.beginPath(); ctx.arc(X, Y - 0.04, 0.065 - i * 0.004, Math.PI, 0);
    paint(ctx, shade(G, 0.2), { lw: 0.02 });
  }
  if (!Q.detail) return;
  // The grin, along the near side of the snout.
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) { const u = 0.5 + i * 0.09; const [X, Y] = pt(u, -half(u) + 0.02, 0.12 + (i % 2) * 0.06); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.04; ctx.lineJoin = 'miter'; ctx.stroke();
  // Goggly eyes.
  for (const v of [0.11, -0.11]) {
    const [X, Y] = pt(0.52, v, 0.34);
    ctx.beginPath(); ctx.arc(X, Y, 0.09, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(X + 0.025, Y + 0.01, 0.04, 0, Math.PI * 2); ctx.fill();
  }
  // Its shine, and the valve.
  const [hX, hY] = pt(-0.2, 0.12, 0.24);
  ctx.beginPath(); ctx.ellipse(hX, hY, 0.25, 0.05, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = alpha(C.white, 0.6); ctx.fill();
  const [vX, vY] = pt(-0.6, -0.08, 0.22);
  ctx.beginPath(); ctx.arc(vX, vY, 0.04, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 });
}

// A funnel point: round the funnel at angle a, height z, out from its skin by
// d, allowing for the rake.
const funnelPt = (a, z, d = 0) => {
  const lean = RAKE * clamp((z - FZ0) / (FZ1 - FZ0));
  return [FX - lean + (FR + d) * Math.cos(a), FY + (FR + d) * Math.sin(a), z];
};

// A big man's body: shirtless, a belly, flamingo trunks.
const BIG = { skin: SKIN[1], hair: HAIR[4], style: 'bald', top: SKIN[1], bottom: INK.flamingo, scale: 1.22, phase: 2 };
const belly = (ctx, b) => {
  ctx.beginPath(); ctx.ellipse(0.12, b.hipY - 0.32, 0.36, 0.4, 0, 0, Math.PI * 2);
  paint(ctx, BIG.skin, { lw: 0.03 });
  if (Q.detail) { ctx.fillStyle = shade(BIG.skin, 0.4); ctx.beginPath(); ctx.arc(0.26, b.hipY - 0.24, 0.03, 0, Math.PI * 2); ctx.fill(); }
};
const BIG_SICK = 130;

export default {
  id: 'waterslide',
  name: 'The Waterslide',
  blurb: 'A big man is stuck in the corkscrew again. The queue at the top is being very patient about it.',
  describe: 'The stern end of the Sun Deck, open to the sky. On the left the Corkscrew\'s yellow tube twists down from its tower into a splash pool, beside the big red funnel with its knife and fork crest. Mini golf and a windmill fill the front, and the passengers get greener by the hour.',

  build(R) {
    deck(R, 'waterslide', 'sun', { rails: true, grid: false, name: false });

    // ---------- The deck ----------
    // Teak planks along the ship, like the rest of the Sun Deck.
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
      // Non-slip matting round the splash pool and under the stairs.
      rect(ctx, SX0 - 1.0, SY0 - 0.8, SX1 - SX0 + 1.9, SY1 - SY0 + 1.6, 0.005, tint(MAT.pool, 0.55), { stroke: false, dots: MAT.pool, density: 0.12 });
      rect(ctx, SX0 - 0.45, SY0 - 0.45, SX1 - SX0 + 0.9, SY1 - SY0 + 0.9, 0.01, C.white, { lw: 0.04 });
      if (Q.detail) {
        for (let x = SX0 - 0.45; x < SX1 + 0.4; x += 0.9) face(ctx, [[x, SY1, 0.01], [x, SY1 + 0.45, 0.01]], null, { lw: 0.02, stroke: C.greyLight });
        textFloor(ctx, (SX0 + SX1) / 2, SY1 + 0.23, 'SPLASH ZONE. YOU WILL GET WET.', 0.2);
        textFloor(ctx, SX0 + 1.3, SY0 - 0.23, '2 FT', 0.24);
      }
      // The pool's inside: its two far walls and its floor, seen through the
      // opening only (sunk below the deck, they'd otherwise spill down the
      // screen over the near coping and the lifeguard's chair).
      ctx.save();
      splashHole(ctx);
      ctx.clip();
      face(ctx, [[SX0, SY0, 0], [SX0, SY1, 0], [SX0, SY1, BED], [SX0, SY0, BED]], tint(MAT.pool, 0.25), { dots: shade(MAT.pool, 0.25), density: 0.25 });
      face(ctx, [[SX0, SY0, 0], [SX1, SY0, 0], [SX1, SY0, BED], [SX0, SY0, BED]], tint(MAT.pool, 0.1), { dots: shade(MAT.pool, 0.25), density: 0.2 });
      rect(ctx, SX0, SY0, SX1 - SX0, SY1 - SY0, BED, MAT.pool, { stroke: false });
      ctx.restore();
      // Wet footprints from the pool out to the Pool.
      if (Q.detail) {
        ctx.fillStyle = alpha(MAT.teakDark, 0.5);
        for (let i = 0; i < 14; i++) {
          const x = 4.6 + i * 0.75, y = 13.8 + Math.min(i, 3) * 0.45 + (i % 2) * 0.22;
          const [X, Y] = P(x, y, 0);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.06, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      // The mini golf: carpet, with a teak edge. A deep green (C.green), so
      // the biggest green thing on the top deck is never the clue's green.
      rect(ctx, 10, 10.4, 5.2, 4.2, 0.02, C.green, { lw: 0.04, dots: shade(C.green, 0.35), density: 0.18 });
      if (Q.detail) {
        for (const [x, y] of [[11.1, 13.7], [12.4, 11.1]]) disc(ctx, x, y, 0.03, 0.13, C.ink, { stroke: false });
        textFloor(ctx, 12.6, 14.25, 'TEE', 0.22, alpha(C.white, 0.8));
      }
      // The splash pool's queue, painted on the deck by the stairs.
      if (Q.detail) {
        textFloor(ctx, 1.6, 8.9, 'QUEUE', 0.26, alpha(C.white, 0.75));
      }
    });
    // The water, rippling, and a lost sun hat going round.
    R.rug((ctx, t) => {
      ctx.save();
      splashHole(ctx);
      ctx.clip();
      poly(ctx, [[SX0, SY0, WZ], [SX1, SY0, WZ], [SX1, SY1, WZ], [SX0, SY1, WZ]]);
      ctx.fillStyle = alpha(C.water, 0.78);
      ctx.fill();
      if (!Q.detail) { ctx.restore(); return; }
      ctx.clip();
      ctx.strokeStyle = alpha(C.white, 0.75);
      ctx.lineWidth = 0.07;
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const y = SY0 + 0.5 + (i % 4) * 0.95 + (i > 3 ? 0.45 : 0);
        const x = SX0 + ((i * 2.3 + t * 0.3 * (i % 2 ? 1 : -0.7)) % (SX1 - SX0) + (SX1 - SX0)) % (SX1 - SX0);
        ctx.beginPath();
        for (let k = 0; k <= 4; k++) {
          const [X, Y] = P(x + k * 0.24, y + Math.sin(t * 2 + k + i) * 0.08, WZ);
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }, { anim: true });

    // ---------- The far rail ----------
    // The lifeboat on its davits, with a passenger hiding in it. (Not a
    // stowaway: the ship has one of those, and it isn't him.)
    R.thing(4.5, 1.3, (ctx) => {
      const x = 2;
      for (const dx of [0.5, 4]) {
        const [A, B] = P(x + dx, 0.05, 0), [E, F] = P(x + dx, 0.05, 4.2), [G, H] = P(x + dx, 0.7, 4.3);
        ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F); ctx.quadraticCurveTo(E + 0.1, F - 0.5, G, H);
        ctx.lineCap = 'round';
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2; ctx.stroke();
        ctx.strokeStyle = C.white; ctx.lineWidth = 0.12; ctx.stroke();
        const [I, J] = P(x + dx, 0.7, 3.45);
        ctx.beginPath(); ctx.moveTo(G, H); ctx.lineTo(I, J); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      }
      lifeboat(ctx, x, 0.1, 2.2, 4.5, { rope: false });
      lettering(ctx, 'x', 3.3, 1.16, 2.62, 'BOTTOMLESS 1', 0.24);
      lettering(ctx, 'x', 3.3, 1.08, 2.4, 'HIDING FROM THE IN-LAWS', 0.11);
    });
    // His head, up out of the cover now and then for a look round (and when
    // somebody knocks on the boat).
    const inlaws = R.poke({ id: 'lifeboat', at: [3.6, 0.9, 3.2], r: 0.9, sound: 'tick', hold: 1.6, say: ['Shh! Are they gone?', 'Not yet. Shh.', 'Tell them I fell overboard.'] });
    R.thing(3.3, 1.35, (ctx, t) => {
      const k = pulse(t, 13, 4);
      const up = Math.max(inlaws.k(), k < 0.08 ? k / 0.08 : k < 0.3 ? 1 : k < 0.36 ? 1 - (k - 0.3) / 0.06 : 0);
      if (up <= 0) return;
      const [X, Y] = P(3.1, 0.7, 3.4 + up * 0.35);
      ctx.save();
      ctx.beginPath(); ctx.rect(X - 1, Y - 2, 2, 2 + (P(3.1, 0.7, 3.45)[1] - Y));
      ctx.clip();
      ctx.beginPath(); ctx.arc(X, Y - 0.2, 0.28, 0, Math.PI * 2);
      paint(ctx, SKIN[2], { lw: 0.03 });
      ctx.fillStyle = HAIR[6];
      ctx.beginPath(); ctx.arc(X, Y - 0.28, 0.29, Math.PI, 0); ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.fillRect(X - 0.2, Y - 0.24, 0.42, 0.1);
      ctx.restore();
    }, { anim: true });

    // The towel hut, by the lift: empty since 5am (every towel on board is
    // on a lounger at the Pool). The Pool's bar has the Gander Cola cooler.
    R.thing(15, 1.1, (ctx) => {
      box(ctx, 14.4, 0.2, 0, 1.2, 0.85, 2.4, INK.hullWhite, { top: tint(INK.teak, 0.3), dotsL: shade(INK.hullWhite, 0.25) });
      face(ctx, [[14.55, 1.06, 0.3], [15.45, 1.06, 0.3], [15.45, 1.06, 1.9], [14.55, 1.06, 1.9]], MAT.teakDark, { lw: 0.02 });
      for (const z of [0.75, 1.3]) face(ctx, [[14.55, 1.07, z], [15.45, 1.07, z], [15.45, 1.07, z + 0.05], [14.55, 1.07, z + 0.05]], INK.teak, { lw: 0.015 });
      // One towel left, folded, and it's damp.
      box(ctx, 14.62, 0.7, 1.35, 0.32, 0.3, 0.1, INK.flamingo, { flat: true, lw: 0.015 });
      board(ctx, 'x', 15, 1.08, 2.15, 1.05, 0.34, 'TOWELS', { board: INK.sea, ink: C.white, size: 0.17, edge: 0.02 });
      board(ctx, 'x', 15.1, 1.09, 1.05, 0.62, 0.3, '', { board: C.white, edge: 0.015 });
      lettering(ctx, 'x', 15.1, 1.1, 1.12, 'NONE LEFT', 0.07, INK.funnelRed);
      lettering(ctx, 'x', 15.1, 1.1, 0.99, 'SINCE 5AM', 0.07, C.ink);
    });
    R.poke({ id: 'towels', at: [15, 1.1, 1.2], r: 0.8, sound: 'tick', say: ['None left. Since 5am.', 'Try the loungers. All of them.', 'Still none.'] });

    // The sunbather who found the one spot left: on top of the lift house.
    R.thing(12.7, 0.95, (ctx, t) => {
      // (Not the Pool's pink towel and not the Pool's sunbather: a striped
      // beach towel and a man in red trunks, so the two never read as one.)
      rect(ctx, 10.5, 0.15, 3.1, 0.62, 4.41, INK.sunYellow, { lw: 0.02 });
      if (Q.detail) for (let i = 0; i < 4; i++) rect(ctx, 10.75 + i * 0.75, 0.15, 0.22, 0.62, 4.415, C.white, { stroke: false });
      const k = green(t, 100);
      person(ctx, 12.5, 0.5, 4.45, { skin: qz(SKIN[3], k), hair: HAIR[1], style: 'short', top: INK.funnelRed, bottom: INK.funnelRed, pose: 'lie', dir: 'r', arms: [0.3, 0.2] }, t);
      cocktail(ctx, 13.7, 0.55, 4.41);
      if (k > 0.5) bucket(ctx, 10.7, 0.45, 4.41);
    }, { anim: true });

    // ---------- The funnel ----------
    // The white plinth, the red funnel raked back, the black top, the crest,
    // and whatever's landed up there.
    R.thing(FX, FY, (ctx) => {
      cylinder(ctx, FX, FY, 0, FR + 0.25, FZ0, INK.hullWhite, { top: tint(C.greyLight, 0.3) });
      const ell = (z) => { const [cx, cy] = funnelPt(0, z, -FR); return [...P(cx, cy, z), FR * Math.SQRT2, FR / Math.SQRT2]; };
      const band = (z0, z1, color, o = {}) => {
        const [x0, y0, rx, ry] = ell(z0), [x1, y1] = ell(z1);
        ctx.beginPath();
        ctx.moveTo(x1 - rx, y1);
        ctx.lineTo(x0 - rx, y0);
        ctx.ellipse(x0, y0, rx, ry, 0, Math.PI, 0, true);
        ctx.lineTo(x1 + rx, y1);
        ctx.ellipse(x1, y1, rx, ry, 0, 0, Math.PI, false);
        ctx.closePath();
        paint(ctx, color, o);
      };
      band(FZ0, FZ1, INK.funnelRed, { lw: 0.05 });
      band(9.7, FZ1, C.black, { lw: 0.04 });
      band(9.35, 9.7, INK.hullWhite, { lw: 0.03 });
      // Shade down its left side, and a highlight on the right.
      if (Q.detail) {
        ctx.save();
        band(FZ0, 9.35, null, { stroke: false });
        ctx.clip();
        const [x0, y0, rx] = ell(FZ0), [x1, y1] = ell(9.35);
        ctx.beginPath(); ctx.moveTo(x0 - rx, y0 + 2); ctx.lineTo(x0 - rx * 0.3, y0 + 2); ctx.lineTo(x1 - rx * 0.3, y1 - 2); ctx.lineTo(x1 - rx, y1 - 2); ctx.closePath();
        ctx.fillStyle = dots(shade(INK.funnelRed, 0.6), 0.3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x0 + rx * 0.5, y0 + 2); ctx.lineTo(x0 + rx * 0.62, y0 + 2); ctx.lineTo(x1 + rx * 0.62, y1 - 2); ctx.lineTo(x1 + rx * 0.5, y1 - 2); ctx.closePath();
        ctx.fillStyle = alpha(C.white, 0.25); ctx.fill();
        // Sun-faded patches, waiting for the painter.
        for (const [a, z, w, h] of [[0.5, 4.6, 0.5, 0.8], [0.62, 2.6, 0.7, 0.55], [0.08, 7.6, 0.4, 0.6]]) {
          const [px, py, pz] = funnelPt(a * Math.PI, z);
          const [X, Y] = P(px, py, pz);
          ctx.beginPath(); ctx.ellipse(X, Y, w, h, 0, 0, Math.PI * 2);
          ctx.fillStyle = alpha(INK.flamingo, 0.35); ctx.fill();
        }
        ctx.restore();
      }
      // The top: the rim, and the dark inside.
      const [tx, ty, rx, ry] = ell(FZ1);
      ctx.beginPath(); ctx.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2);
      paint(ctx, shade(C.black, 0.2), { lw: 0.05 });
      ctx.beginPath(); ctx.ellipse(tx, ty + 0.03, rx * 0.86, ry * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.ink; ctx.fill();
      // The crest, on the side facing us.
      const [cx, cy, cz] = funnelPt(Math.PI / 4, 6.3);
      crest(ctx, ...P(cx, cy, cz), 1.7);
      // A whistle on a pipe up the front.
      const [wx, wy] = funnelPt(0.12 * Math.PI, 9.2, 0.12);
      box(ctx, wx - 0.12, wy - 0.12, 8.6, 0.24, 0.24, 0.9, MAT.brass, { flat: true, lw: 0.03 });
    });
    // Somebody's flip-flop, stuck in the top of the funnel, its toe and strap
    // up out of the smoke. Tap the funnel and it coughs it out onto the rim.
    // Nobody knows how it got up there.
    const cough = R.poke({ id: 'funnel', at: [FX - 0.2, FY + 0.3, FZ1 + 0.1], r: 1.0, sound: 'clunk', say: ['PFFFT. (Cough.)', 'Smoke break.', 'That is not a chimney.'] });
    R.thing(FX + 0.5, FY + 0.5, (ctx, t) => {
      const k = cough.k();
      const [fx, fy] = funnelPt(0.2 * Math.PI, FZ1, -0.05);
      const [cx, cy] = funnelPt(0, FZ1, -FR);
      if (k > 0.98) { flipflop(ctx, fx, fy, FZ1 + 0.05, 0.35, 0.78); return; }
      // The cough: a black puff out of the top as it goes.
      if (k > 0.02 && Q.detail) {
        const [X, Y] = P(cx, cy, FZ1 + 0.4 + k * 1.2);
        ctx.beginPath(); ctx.arc(X, Y, 0.4 + k * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.ink, 0.5 * (1 - k)); ctx.fill();
      }
      // Flying: up out of the mouth and over onto the rim.
      if (k > 0.02) {
        const x = cx + (fx - cx) * k, y = cy + (fy - cy) * k, z = FZ1 + 0.05 + Math.sin(Math.PI * k) * 1.4;
        flipflop(ctx, x, y, z, 0.35 + k * 3, 0.78);
        return;
      }
      // Stuck: on end in the mouth, toe and strap up over the rim (only what's
      // above the near lip, or seen down the opening, shows).
      const ell = funnelPt(0, FZ1, -FR);
      const [eX, eY] = P(...ell);
      const rx = FR * Math.SQRT2, ry = FR / Math.SQRT2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(eX - rx, eY - 3, rx * 2, 3);
      ctx.ellipse(eX, eY + 0.03, rx * 0.86, ry * 0.8, 0, 0, Math.PI * 2);
      ctx.clip();
      const [sX, sY] = P(cx + 0.55, cy + 0.15, FZ1);
      ctx.translate(sX, sY + 0.05);
      ctx.rotate(0.35);
      ctx.beginPath(); ctx.ellipse(0, -0.25, 0.17, 0.42, 0, 0, Math.PI * 2);
      paint(ctx, INK.sunYellow, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(-0.15, -0.05); ctx.lineTo(0.0, -0.45); ctx.lineTo(0.15, -0.05);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
      ctx.strokeStyle = INK.flamingo; ctx.lineWidth = 0.06; ctx.stroke();
      ctx.restore();
    }, { anim: true, depth: FX + FY + 0.6 });
    R.find({
      id: 'flip-flop', label: 'A lost flip-flop', kind: 'poke', inside: cough, at: [FX + 0.95, 5.3, 11.1], r: 0.7,
      hint: 'Way up high, a strap is poking out of something hot. Give it a tap.',
    });

    // Smoke, streaming back over the stern.
    R.air((ctx, t) => {
      const [tx, ty] = funnelPt(0, FZ1, -FR);
      const n = Q.detail ? 11 : 5;
      particles(t, n, 6, (k, r) => {
        const x = tx - 0.3 + r() * 0.6 - k * 5.5, y = ty - 0.2 + r() * 0.4 + k * 0.6;
        const z = FZ1 + 0.3 + k * 2.2 + Math.sin(k * 6 + r() * 6) * 0.25;
        const [X, Y] = P(x, y, z);
        ctx.beginPath(); ctx.arc(X, Y, 0.3 + k * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = alpha(mix(C.grey, C.white, k), 0.5 * (1 - k));
        ctx.fill();
      }, 5);
    });
    // A gull on the rim, hopping: it's hot up there.
    R.thing(FX + 0.3, FY + 0.3, (ctx, t) => {
      const [gx, gy] = funnelPt(0.93 * Math.PI, FZ1, -0.1);
      const hop = Math.max(0, Math.sin(t * 5)) * (pulse(t, 6) < 0.5 ? 0.25 : 0);
      gull(ctx, gx, gy, FZ1 + hop, t, { dir: pulse(t, 6) < 0.5 ? 'r' : 'l', scale: 0.9 });
    }, { anim: true });

    // The painter on his bosun's chair, painting the funnel red again, very
    // slowly, up and down, all day.
    R.mover((t) => {
      const a = 0.62 * Math.PI;
      const z = 5.8 + Math.sin((t * Math.PI) / 25) * 2.4;
      const [x, y] = funnelPt(a, z, 0.45);
      return { x, y, z, a };
    }, (ctx, t, p) => {
      const [rx0, ry0] = funnelPt(p.a - 0.08, FZ1, 0.05), [rx1, ry1] = funnelPt(p.a + 0.08, FZ1, 0.05);
      // Ropes up to the rim, and the plank.
      for (const [rx, ry, dx] of [[rx0, ry0, -0.35], [rx1, ry1, 0.35]]) {
        const [A, B] = P(rx, ry, FZ1), [X, Y] = P(p.x, p.y, p.z + 0.35);
        ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(X + dx, Y);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      }
      const [X, Y] = P(p.x, p.y, p.z + 0.35);
      ctx.fillStyle = MAT.teakDark; ctx.fillRect(X - 0.4, Y - 0.05, 0.8, 0.1);
      const sw = Math.sin(t * 3) * 0.4;
      person(ctx, p.x, p.y, p.z - 0.2, {
        ...CREW_LOOK, skin: SKIN[4], hair: HAIR[1], style: 'short', hat: 'cap', pose: 'sit', dir: 'l', back: true,
        arms: [2.3 + sw, 0.5],
        hold(c) {
          c.beginPath(); c.moveTo(0, 0); c.lineTo(-0.1, -0.7);
          c.strokeStyle = C.ink; c.lineWidth = 0.05; c.stroke();
          c.beginPath(); c.roundRect(-0.28, -0.84, 0.36, 0.16, 0.05); paint(c, INK.funnelRed, { lw: 0.02 });
        },
      }, t);
      // A paint pot on a hook, and the sign.
      if (Q.detail) {
        const [bX, bY] = P(p.x, p.y, p.z + 0.1);
        ctx.beginPath(); ctx.rect(bX + 0.35, bY - 0.05, 0.22, 0.24); paint(ctx, C.greyLight, { lw: 0.02 });
        ctx.fillStyle = INK.funnelRed; ctx.fillRect(bX + 0.35, bY - 0.05, 0.22, 0.06);
        ctx.beginPath(); ctx.rect(bX - 0.4, bY + 0.05, 0.6, 0.26); paint(ctx, C.white, { lw: 0.02 });
        label(ctx, p.x - 0.05, p.y + 0.05, p.z + 0.02, 'WET PAINT', 0.1, C.ink, 'Rethink Sans');
      }
    }, { bias: 0.1 });

    // ---------- The Corkscrew ----------
    // The tower: sky blue, braced in white, the name up high.
    R.thing(3.5, 5.5, (ctx) => {
      box(ctx, TW0[0], TW0[1], 0, 3, 3, TOP - 0.3, C.sky, { dens: 0.14 });
      if (Q.detail) {
        // Bracing on the two faces we see.
        for (let z = 0; z < 7.6; z += 2.05) {
          face(ctx, [[2.1, 7.01, z + 0.1], [4.9, 7.01, z + 1.95]], null, { lw: 0.07, stroke: C.white });
          face(ctx, [[4.9, 7.01, z + 0.1], [2.1, 7.01, z + 1.95]], null, { lw: 0.07, stroke: C.white });
          face(ctx, [[5.01, 4.1, z + 0.1], [5.01, 6.9, z + 1.95]], null, { lw: 0.07, stroke: C.white });
          face(ctx, [[5.01, 6.9, z + 0.1], [5.01, 4.1, z + 1.95]], null, { lw: 0.07, stroke: C.white });
        }
      }
      face(ctx, [[2.15, 7.02, 6.5], [4.85, 7.02, 6.5], [4.85, 7.02, 7.7], [2.15, 7.02, 7.7]], INK.funnelRed, { lw: 0.04 });
      lettering(ctx, 'x', 3.5, 7.03, 7.2, 'THE CORKSCREW', 0.36, C.white);
      lettering(ctx, 'x', 3.5, 7.03, 6.8, 'EST. TUESDAY', 0.16, C.white);
      // The platform on top, and its top landing for the stairs.
      box(ctx, 1.8, 3.2, TOP - 0.3, 3.3, 4.0, 0.3, INK.hullWhite, { top: tint(MAT.pool, 0.6), dotsT: MAT.pool, densT: 0.1 });
      box(ctx, 5.1, 3.2, TOP - 0.3, 1.0, 0.6, 0.3, INK.hullWhite, { top: tint(MAT.pool, 0.6) });
      // Its back and left rails (the front one goes over the people).
      railing(ctx, [1.8, 3.2, TOP], [5.1, 3.2, TOP], [0, 0.35, 0.7, 1]);
      railing(ctx, [1.8, 3.2, TOP], [1.8, 7.2, TOP], [0, 0.33, 0.66, 1]);
      railing(ctx, [5.1, 3.2, TOP], [6.1, 3.2, TOP], [1]);
      // The mouth of the tube, and its signal.
      const [mX, mY] = P(...MOUTH);
      ctx.beginPath(); ctx.ellipse(mX + 0.05, mY, 0.3, 0.44, 0, 0, Math.PI * 2);
      paint(ctx, TUBE, { lw: 0.04 });
      ctx.beginPath(); ctx.ellipse(mX + 0.02, mY, 0.18, 0.32, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.ink; ctx.fill();
      // What people drop at the top of a waterslide: wristbands, a sweet
      // wrapper, a sock. And one thing that isn't theirs.
      if (Q.detail) {
        wristband(ctx, 4.4, 6.85, TOP, C.mint);
        wristband(ctx, 2.4, 5.2, TOP, INK.flamingo);
        wristband(ctx, 3.3, 3.9, TOP, INK.sunYellow);
        // The wrapper, twisted at both ends.
        const [wX, wY] = P(2.9, 6.1, TOP);
        ctx.beginPath(); ctx.moveTo(wX - 0.25, wY - 0.08); ctx.lineTo(wX - 0.12, wY - 0.02); ctx.lineTo(wX + 0.12, wY - 0.02); ctx.lineTo(wX + 0.25, wY - 0.08);
        ctx.lineTo(wX + 0.25, wY + 0.08); ctx.lineTo(wX + 0.12, wY + 0.04); ctx.lineTo(wX - 0.12, wY + 0.04); ctx.lineTo(wX - 0.25, wY + 0.08); ctx.closePath();
        paint(ctx, INK.sunYellow, { lw: 0.02, dots: INK.funnelRed, density: 0.35 });
        // The sock, white with a red stripe.
        const [sX, sY] = P(2.55, 6.75, TOP);
        ctx.beginPath(); ctx.moveTo(sX - 0.3, sY - 0.06); ctx.lineTo(sX + 0.05, sY - 0.06); ctx.quadraticCurveTo(sX + 0.28, sY - 0.04, sX + 0.26, sY + 0.08); ctx.lineTo(sX - 0.3, sY + 0.08); ctx.closePath();
        paint(ctx, C.white, { lw: 0.02 });
        ctx.fillStyle = INK.funnelRed; ctx.fillRect(sX - 0.24, sY - 0.06, 0.07, 0.14);
      }
      // A curl of shed skin: papery, pale green, scaled if you look close.
      {
        const [kX, kY] = P(3.6, 6.4, TOP + 0.02);
        ctx.save();
        ctx.translate(kX, kY);
        ctx.beginPath();
        ctx.moveTo(-0.34, 0.02);
        ctx.bezierCurveTo(-0.3, -0.16, -0.05, -0.2, 0.12, -0.12);
        ctx.bezierCurveTo(0.3, -0.05, 0.36, 0.08, 0.2, 0.12);
        ctx.bezierCurveTo(0.1, 0.15, 0.04, 0.06, 0.12, 0.02);
        ctx.bezierCurveTo(0.0, 0.05, -0.12, 0.12, -0.34, 0.02);
        ctx.closePath();
        paint(ctx, tint(INK.queasyGreen, 0.55), { lw: 0.025 });
        if (Q.detail) {
          ctx.clip();
          ctx.strokeStyle = shade(INK.queasyGreen, 0.2); ctx.lineWidth = 0.012;
          for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
            ctx.beginPath(); ctx.arc(-0.3 + i * 0.13 + (j % 2) * 0.06, -0.14 + j * 0.08, 0.05, 0, Math.PI); ctx.stroke();
          }
        }
        ctx.restore();
      }
    }, { depth: 5.5 });
    R.find({ id: 'shed-skin', label: 'A patch of shed skin', at: [3.6, 6.4, 8.6], r: 0.7 });

    // ---------- The chase: sighting 3 ----------
    // It shed up on the platform, then climbed down the Corkscrew's pole and
    // clings there between two turns of the tube: the turn above hides its
    // head, the one below its tail tip, and its crest and the peeling patches
    // show in the gap. Found, it drops onto the tube and goes down the slide,
    // into the splash pool, and off to the Pool.
    {
      const zH = 5.05; // where it clings, up the pole
      const start = TUBE_PTS.findIndex((p) => p.th != null && p.th >= 4.68);
      const slide = TUBE_PTS.slice(start).filter((_, i, a) => i % 4 === 0 || i === a.length - 1).map((p) => [p.x, p.y, p.z + 0.35]);
      sighting(R, 2, {
        at: [HX - 0.2, HY + 0.05, zH - 0.3], kind: 'hard', r: 0.9,
        hint: 'Something green is hanging on in the middle of the Corkscrew.',
        depth: (t) => (chase.step === 2 && chaseOpen(2, t) ? BACK_D + 1.2 : 40),
        draw(ctx, t) {
          const [X, Y] = P(HX, HY, zH);
          ctx.save();
          // Head up, belly to the pole, on its left side.
          ctx.translate(X - 0.19, Y);
          ctx.rotate(-Math.PI / 2);
          iguana(ctx, 0, 0, 0, 'r', t, {});
          // Shedding: pale papery patches peeling off, and a strip trailing
          // off its tail.
          for (const [x, y, w, h, a] of [[-0.14, -0.33, 0.1, 0.06, 0.3], [0.08, -0.27, 0.08, 0.05, -0.2], [-0.62, -0.08, 0.09, 0.04, 0.4]]) {
            ctx.beginPath(); ctx.ellipse(x, y, w, h, a, 0, Math.PI * 2);
            paint(ctx, tint(INK.queasyGreen, 0.6), { lw: 0.015 });
          }
          ctx.beginPath();
          ctx.moveTo(-0.85, -0.02); ctx.quadraticCurveTo(-0.9, 0.18, -0.78, 0.32); ctx.lineTo(-0.72, 0.28); ctx.quadraticCurveTo(-0.8, 0.14, -0.76, -0.02); ctx.closePath();
          paint(ctx, tint(INK.queasyGreen, 0.6), { lw: 0.015 });
          ctx.restore();
        },
        run: [
          [HX - 0.6, HY - 0.6, zH + 0.1], ...slide,
          [6.2, 10.6, WZ + 0.1], [6.9, 10.4, WZ + 0.1], [7.7, 10.2, 0], [16.6, 9.3, 0],
        ],
      });
    }

    // Flight B, down the tower's right side to the landing, and flight A,
    // along its front to the deck.
    R.thing(5.6, 7.6, (ctx) => {
      const run = 3.3 / 8;
      // The landing, on two posts.
      for (const [x, y] of [[5.2, 7.95], [5.95, 7.95]]) box(ctx, x - 0.06, y - 0.06, 0, 0.12, 0.12, LAND - 0.2, C.white, { flat: true, lw: 0.03 });
      box(ctx, 5.1, 7.1, LAND - 0.2, 1.0, 1.0, 0.2, INK.hullWhite, { top: MAT.teakDark });
      for (let j = 7; j >= 0; j--) {
        const y1 = 7.1 - j * run, y0 = y1 - run, z = LAND + (j + 1) * STEP;
        face(ctx, [[5.1, y1, z - STEP], [6.1, y1, z - STEP], [6.1, y1, z], [5.1, y1, z]], shade(INK.hullWhite, 0.12), { lw: 0.02 });
        face(ctx, [[5.1, y0, z], [6.1, y0, z], [6.1, y1, z], [5.1, y1, z]], MAT.teakDark, { lw: 0.02 });
      }
      // The side, a saw-tooth stringer.
      const side = [[6.1, 7.1, LAND - 0.2]];
      for (let j = 0; j < 8; j++) {
        const y1 = 7.1 - j * run, z = LAND + (j + 1) * STEP;
        side.push([6.1, y1, z], [6.1, y1 - run, z]);
      }
      side.push([6.1, 3.8, TOP - 0.6], [6.1, 6.6, LAND - 0.2]);
      face(ctx, side, INK.hullWhite, { lw: 0.03, dots: shade(INK.hullWhite, 0.4), density: 0.1 });
      railing(ctx, [6.1, 3.2, TOP], [6.1, 7.1, LAND], [0, 0.5, 1]);
      railing(ctx, [6.1, 7.1, LAND], [6.1, 8.1, LAND], [1]);
    }, { depth: 6.2 });
    R.thing(3, 8.1, (ctx) => {
      const run = 4.1 / 8;
      for (let i = 0; i < 8; i++) {
        const x0 = 1.0 + i * run, z = (i + 1) * STEP;
        face(ctx, [[x0, 7.1, z], [x0 + run, 7.1, z], [x0 + run, 8.1, z], [x0, 8.1, z]], MAT.teakDark, { lw: 0.02 });
      }
      const side = [[1.0, 8.1, 0]];
      for (let i = 0; i < 8; i++) {
        const x0 = 1.0 + i * run, z = (i + 1) * STEP;
        side.push([x0, 8.1, z], [x0 + run, 8.1, z]);
      }
      side.push([5.1, 8.1, LAND - 0.6], [1.7, 8.1, 0]);
      face(ctx, side, INK.hullWhite, { lw: 0.03, dots: shade(INK.hullWhite, 0.45), density: 0.12 });
      railing(ctx, [1.0, 8.1, 0], [5.1, 8.1, LAND], [0, 0.5, 1]);
      railing(ctx, [5.1, 8.1, LAND], [6.1, 8.1, LAND], [1]);
    }, { depth: 6.3 });

    // The corkscrew: the back half of every turn, the pole, then the front
    // half, so the tube wraps round it.
    R.thing(HX, HY, (ctx) => {
      if (Q.detail) {
        for (let z = 7.2; z > 1; z -= 1.35) {
          const th = TH0 + ((Z0 - z) / (Z0 - Z1)) * (TH1 - TH0);
          if (Math.cos(th) + Math.sin(th) > 0) continue;
          stick(ctx, [HX, HY, z], [HX + HR * Math.cos(th), HY + HR * Math.sin(th), z], 0.08, C.white);
        }
      }
      for (const run of RUNS) if (!run.front) tubeRun(ctx, run);
      disc(ctx, HX, HY, 0, 0.45, C.white, { lw: 0.03 });
      cylinder(ctx, HX, HY, 0, 0.17, Z0 + 0.5, C.white, { flat: true });
    }, { depth: BACK_D });
    R.thing(HX + 0.5, HY + 0.5, (ctx) => {
      if (Q.detail) {
        for (let z = 7.2; z > 1; z -= 1.35) {
          const th = TH0 + ((Z0 - z) / (Z0 - Z1)) * (TH1 - TH0);
          if (Math.cos(th) + Math.sin(th) <= 0) continue;
          stick(ctx, [HX, HY, z], [HX + HR * Math.cos(th), HY + HR * Math.sin(th), z], 0.08, C.white);
        }
      }
      for (const run of RUNS) if (run.front) tubeRun(ctx, run);
      // Where the tube opens out into the flume: the dark inside of its end.
      const p = tubeAt(U_OPEN), q = tubeAt(U_OPEN + 0.005);
      const [X, Y] = P(p.x, p.y, p.z), [E, F] = P(q.x, q.y, q.z);
      ctx.save();
      ctx.translate(X, Y); ctx.rotate(Math.atan2(F - Y, E - X));
      ctx.beginPath(); ctx.ellipse(0, 0, 0.2, 0.42, 0, 0, Math.PI * 2);
      paint(ctx, C.ink, { lw: 0.04, stroke: TUBE });
      ctx.restore();
      // The chute's lip over the water.
      const [cX, cY] = P(...CHUTE);
      ctx.beginPath(); ctx.ellipse(cX, cY, 0.44, 0.22, 0, 0, Math.PI * 2);
      paint(ctx, tint(C.water, 0.4), { lw: 0.04 });
    }, { depth: FRONT_D });
    // Water running down the flume.
    R.thing(HX + 0.6, HY + 0.6, (ctx, t) => {
      if (!Q.detail) return;
      ctx.setLineDash([0.3, 0.45]);
      ctx.lineDashOffset = -t * 3;
      ctx.lineCap = 'round';
      for (const run of RUNS) {
        if (!run.open) continue;
        tubePath(ctx, run.pts, -0.16);
        ctx.strokeStyle = alpha(C.white, 0.85); ctx.lineWidth = 0.06; ctx.stroke();
      }
      ctx.setLineDash([]);
    }, { anim: true, depth: FRONT_D + 0.01 });

    // The platform's front rail, its sun canopy, and the signal at the mouth.
    R.thing(3.5, 7.2, (ctx) => {
      // (No post where you'd look for what's on the floor.)
      railing(ctx, [1.8, 7.2, TOP], [4.9, 7.2, TOP], [0, 0.35, 0.65]);
      railing(ctx, [5.1, 4.4, TOP], [5.1, 5.7, TOP], [0, 1]);
      // (Up high enough that it doesn't hide the heads of the people under it.)
      for (const [x, y] of [[1.9, 3.3], [5.0, 3.3], [1.9, 7.1], [5.0, 7.1]]) {
        face(ctx, [[x, y, TOP], [x, y, CANOPY]], null, { lw: 0.08, stroke: C.white });
      }
      // The canopy, striped, a little peaked.
      const z = CANOPY, peak = CANOPY + 0.7;
      const pts = [[1.7, 3.1], [5.2, 3.1], [5.2, 7.3], [1.7, 7.3]];
      const mid = [3.45, 5.2, peak];
      for (let i = 0; i < 4; i++) {
        const a = pts[i], b = pts[(i + 1) % 4];
        const n = 4;
        for (let j = 0; j < n; j++) {
          const p0 = lerp3([a[0], a[1], z], [b[0], b[1], z], j / n), p1 = lerp3([a[0], a[1], z], [b[0], b[1], z], (j + 1) / n);
          face(ctx, [p0, p1, mid], j % 2 ? C.white : INK.flamingo, { lw: 0.03 });
        }
      }
      // Its scalloped edge along the front.
      if (Q.detail) {
        for (let j = 0; j < 7; j++) {
          const x = 1.7 + (j + 0.5) * 0.5;
          const [X, Y] = P(x, 7.3, z);
          ctx.beginPath(); ctx.arc(X, Y, 0.18, 0, Math.PI); paint(ctx, j % 2 ? C.white : INK.flamingo, { lw: 0.02 });
        }
      }
    }, { depth: 12.5 });
    R.thing(5.0, 5.75, (ctx, t) => {
      const go = cyc(t) >= POP + 1.5 && cyc(t) < GO(N - 1) + 1;
      box(ctx, 4.95, 5.7, TOP, 0.1, 0.1, 1.5, C.ink, { flat: true, stroke: false });
      box(ctx, 4.85, 5.6, TOP + 1.5, 0.3, 0.3, 0.75, C.ink, { flat: true, lw: 0.02 });
      const [X, Y] = P(5.0, 5.9, TOP + 1.88);
      ctx.beginPath(); ctx.arc(X, Y - 0.12, 0.09, 0, Math.PI * 2); ctx.fillStyle = go ? shade(INK.funnelRed, 0.5) : INK.funnelRed; ctx.fill();
      ctx.beginPath(); ctx.arc(X, Y + 0.14, 0.09, 0, Math.PI * 2); ctx.fillStyle = go ? C.leaf : shade(C.leaf, 0.6); ctx.fill();
    }, { anim: true, depth: 10.8 });

    // The slide attendant up top, whistle ready. Crew: never green.
    // (At the front of the platform, where the canopy doesn't hide him.)
    R.thing(ATT[0], ATT[1], (ctx, t) => {
      const c = cyc(t);
      const flush = c >= POP + 1.5 && c < GO(N - 1) + 1;
      person(ctx, ATT[0], ATT[1], TOP, {
        ...CREW_LOOK, skin: SKIN[3], hair: HAIR[0], style: 'pony', top: C.white, bottom: INK.funnelRed, hat: 'cap',
        pose: flush ? 'point' : 'stand', dir: 'r', arms: flush ? [1.5 + Math.sin(t * 8) * 0.3, 0.2] : [0.3, -0.3],
        face(c2, hy, back) { if (!back) { c2.fillStyle = MAT.chrome; c2.fillRect(0.2, hy + 0.1, 0.14, 0.07); } },
      }, t);
    }, { anim: true, depth: 9.9 });

    // ---------- The queue and the ride ----------
    const riderDraw = (look, sick, hold, lines, k) => (ctx, t, p) => {
      if (!p || p.hidden) return;
      const c = cyc(t);
      const skin = qz(look.skin, green(t, sick));
      const big = p.big;
      const L = big ? { ...BIG, skin: qz(BIG.skin, green(t, BIG_SICK)), wear: belly } : { ...look, skin };
      const s = L.scale || 1;
      ctx.save();
      if (p.a != null && p.a < 1) ctx.globalAlpha *= p.a;
      switch (p.kind) {
        case 'queue':
          person(ctx, p.x, p.y, p.z, { ...L, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, hold: p.moving ? undefined : hold, arms: hold && !p.moving ? [1.2, 0.2] : undefined }, t);
          break;
        case 'seat':
          person(ctx, p.x, p.y, p.z - 0.05, { ...L, pose: 'sit', dir: 'r', arms: [2.7, -2.7] }, t);
          break;
        case 'bulge': {
          const [X, Y] = P(p.x, p.y, p.z);
          ctx.beginPath(); ctx.ellipse(X, Y, big ? 0.7 : 0.55, big ? 0.62 : 0.5, 0, 0, Math.PI * 2);
          paint(ctx, TUBE, { lw: 0.05 });
          ctx.beginPath(); ctx.ellipse(X - 0.1, Y - 0.18, 0.2, 0.08, -0.3, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, 0.6); ctx.fill();
          if (Q.detail) {
            const f = p.dir === 'r' ? -1 : 1;
            ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04;
            for (const dy of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(X + f * 0.75, Y + dy); ctx.lineTo(X + f * 1.1, Y + dy); ctx.stroke(); }
          }
          break;
        }
        case 'flume': {
          // Sitting in the open flume, arms up: only what's above its rim.
          const [, Y] = P(p.x, p.y, p.z);
          ctx.beginPath(); ctx.rect(-50, -50, 100, Y + 50 - 0.05); ctx.clip();
          person(ctx, p.x, p.y, p.z - 0.55 * s, { ...L, pose: 'sit', dir: p.dir, arms: [2.7, -2.7] }, t);
          break;
        }
        case 'fly':
          person(ctx, p.x, p.y, p.z, { ...L, pose: 'cheer', dir: 'l', arms: [2.6, -2.6] }, t);
          break;
        case 'swim': {
          const [X, Y] = P(p.x, p.y, WZ);
          ctx.beginPath(); ctx.ellipse(X, Y, big ? 0.9 : 0.6, big ? 0.4 : 0.28, 0, 0, Math.PI * 2);
          ctx.strokeStyle = alpha(C.white, 0.85); ctx.lineWidth = 0.07; ctx.stroke();
          person(ctx, p.x, p.y, WZ - 0.8 * s, { ...L, pose: big ? 'swim' : 'swim', dir: p.dir, speed: big ? 3 : 7 }, t);
          break;
        }
        case 'walk':
          person(ctx, p.x, p.y, p.z, { ...L, pose: 'walk', dir: p.dir, back: p.back }, t);
          break;
      }
      ctx.restore();
    };
    RIDERS.forEach((rd, k) => {
      const hold = rd.drink ? (c) => {
        c.beginPath(); c.moveTo(-0.07, -0.34); c.lineTo(-0.05, 0); c.lineTo(0.05, 0); c.lineTo(0.07, -0.34); c.closePath();
        paint(c, INK.queasyGreen, { lw: 0.02 });
      } : undefined;
      R.mover((t) => crowd(t).riders[k], riderDraw(rd.look, rd.sick, hold, LINES, k));
    });

    // The big man: queueing, sliding, stuck (feet out, kicking), then out.
    // Knock on the tube where he sticks and whoever's in there answers (he
    // kicks harder). Nothing's hidden in it: it's the one a first visit is
    // nudged to tap.
    const knock = (() => { const b = tubeAt(U_STUCK); return R.poke({ id: 'corkscrew', at: [b.x, b.y, b.z], r: 1.0, sound: 'clunk', hold: 1.4, teach: true, say: ['Occupied!', 'Still occupied!', 'Day four of the buffet.', 'Push! No, pull!'] }); })();
    const bigDraw = riderDraw(BIG, BIG_SICK, undefined, null, -1);
    R.mover((t) => crowd(t).big, (ctx, t, p) => {
      const c = cyc(t);
      if (p.kind !== 'stuck') {
        bigDraw(ctx, t, { ...p, big: true });
      } else {
        // His middle, wedged in the tube, which has gone a bit round.
        const b = tubeAt(U_STUCK);
        const [X, Y] = P(b.x, b.y, b.z);
        const hard = 1 + 1.6 * knock.k();
        const w = 1 + Math.sin(t * 9 * hard) * 0.03 * hard;
        ctx.beginPath(); ctx.ellipse(X, Y, 0.82 * w, 0.68 * w, -0.2, 0, Math.PI * 2);
        paint(ctx, TUBE, { lw: 0.05 });
        ctx.beginPath(); ctx.ellipse(X - 0.15, Y - 0.26, 0.26, 0.09, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.6); ctx.fill();
        if (Q.detail) {
          ctx.strokeStyle = shade(TUBE, 0.45); ctx.lineWidth = 0.03;
          for (const r of [0.45, 0.62]) { ctx.beginPath(); ctx.ellipse(X, Y, r, r * 0.8, -0.2, 0.3, 1.2); ctx.stroke(); }
        }
        // His legs, out of the end of the tube, kicking.
        const o = tubeAt(U_OPEN), q = tubeAt(U_OPEN + 0.01);
        const [oX, oY] = P(o.x, o.y, o.z), [qX, qY] = P(q.x, q.y, q.z);
        const base = Math.atan2(qY - oY, qX - oX) + 0.75;
        ctx.beginPath(); ctx.ellipse(oX, oY, 0.3, 0.34, 0, 0, Math.PI * 2);
        paint(ctx, INK.flamingo, { lw: 0.03, dots: C.white, density: 0.3 });
        [0, 1].forEach((i) => {
          const kick = Math.sin(t * 11 * hard + i * Math.PI) * 0.35 * Math.min(hard, 1.8);
          const a = base + (i ? 0.3 : -0.2) + kick;
          const ex = oX + Math.cos(a) * 1.3, ey = oY + Math.sin(a) * 1.3;
          ctx.beginPath(); ctx.moveTo(oX + (i ? 0.08 : -0.08), oY); ctx.lineTo(ex, ey);
          ctx.lineCap = 'round';
          if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.42; ctx.stroke(); }
          ctx.strokeStyle = BIG.skin; ctx.lineWidth = 0.32; ctx.stroke();
          // Bare feet. (The only flip-flop here is the lost one.)
          ctx.save();
          ctx.translate(ex, ey); ctx.rotate(a + Math.PI / 2);
          ctx.beginPath(); ctx.ellipse(0, 0.12, 0.17, 0.28, 0, 0, Math.PI * 2);
          paint(ctx, BIG.skin, { lw: 0.03 });
          ctx.restore();
        });
      }
    });

    // The splashes: a small one for everyone, and his.
    R.thing(SX1 + 0.5, SY1 + 0.5, (ctx, t) => {
      if (!Q.detail) return;
      const c = cyc(t);
      const splash = (x, y, k, n, size, seed, reach = 1) => {
        const [X, Y] = P(x, y, WZ);
        ctx.beginPath(); ctx.ellipse(X, Y, (0.4 + k * 1.6) * size, (0.2 + k * 0.8) * size, 0, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(C.white, 0.9 * (1 - k)); ctx.lineWidth = 0.08; ctx.stroke();
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + seed, v = (0.8 + ((i * 7 + seed * 3) % 5) * 0.12) * size * reach;
          const dx = Math.cos(a) * v * k * 1.6, dy = Math.sin(a) * v * k * 1.6;
          const z = WZ + v * 3.2 * k - 4.2 * k * k * size;
          if (z < WZ - 0.1) continue;
          const [dX, dY] = P(x + dx, y + dy, z);
          ctx.beginPath(); ctx.arc(dX, dY, 0.09 * size, 0, Math.PI * 2);
          paint(ctx, tint(C.water, 0.55), { lw: 0.02 });
        }
      };
      const { riders } = crowd(t);
      riders.forEach((p, k) => {
        const r = (c >= GO(k) ? c : c + CYCLE) - GO(k) - 2.8;
        if (r >= 0 && r < 1) splash(RIDERS[k].spl[0], RIDERS[k].spl[1], r, 6, 0.8, k);
      });
      // His: a column of water, and a wave over the queue by the rail.
      const b = c - SPLASH;
      if (b >= 0 && b < 2.2) {
        const k = b / 2.2;
        splash(BIG_SPL[0], BIG_SPL[1], k, 18, 1.6, 0.3, 1.2);
        if (b < 0.9) {
          const h = Math.sin((b / 0.9) * Math.PI) * 3.2;
          const [X, Y] = P(BIG_SPL[0], BIG_SPL[1], WZ), [, Yt] = P(BIG_SPL[0], BIG_SPL[1], WZ + h);
          ctx.beginPath();
          ctx.moveTo(X - 0.7, Y);
          ctx.bezierCurveTo(X - 0.25, Y - 0.3, X - 0.45, Yt + 0.5, X - 0.9, Yt);
          for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(X - 0.9 + i * 0.45 + 0.22, Yt - 0.55, X - 0.9 + (i + 1) * 0.45, Yt);
          ctx.bezierCurveTo(X + 0.45, Yt + 0.5, X + 0.25, Y - 0.3, X + 0.7, Y);
          ctx.closePath();
          paint(ctx, tint(C.water, 0.6), { lw: 0.04, dots: C.white, density: 0.35 });
        }
        // Drops, all the way over to the people queueing by the rail.
        for (let i = 0; i < 8; i++) {
          const kk = clamp(b / 1.3 - i * 0.03);
          if (kk <= 0 || kk >= 1) continue;
          const x = lerp(BIG_SPL[0], 0.9 + (i % 3) * 0.2, kk), y = lerp(BIG_SPL[1], 9.2 + i * 0.3, kk);
          const [X, Y] = P(x, y, WZ + 4 * kk * (1 - kk) * 3.5 + (1 - kk) * 0.3);
          ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, Math.PI * 2);
          paint(ctx, tint(C.water, 0.55), { lw: 0.02 });
        }
      }
    }, { anim: true });

    // A kid on a ring in the splash pool, waiting for the big one.
    R.mover((t) => {
      const a = t * 0.5;
      return { x: 2.95 + Math.cos(a) * 0.35, y: 9.95 + Math.sin(a) * 0.3 };
    }, (ctx, t, p) => {
      const c = cyc(t);
      const rock = c > SPLASH && c < SPLASH + 3 ? Math.sin((c - SPLASH) * 9) * 0.12 * (1 - (c - SPLASH) / 3) : 0;
      const z = WZ + 0.12 + Math.sin(t * 1.5) * 0.03 + Math.abs(rock);
      disc(ctx, p.x, p.y, z, 0.62, INK.sunYellow, { lw: 0.04, dots: C.white, density: 0.3 });
      disc(ctx, p.x, p.y, z + 0.01, 0.32, alpha(C.water, 1), { lw: 0.03 });
      const look = folk(19, { hat: 'none', top: C.coral, scale: 0.7 });
      person(ctx, p.x + 0.05, p.y + 0.05, z - 0.25, { ...look, pose: 'sit', dir: 'l', arms: c > SPLASH && c < SPLASH + 3 ? [2.8, -2.8] : [0.8, 0.6] }, t);
    });

    // An inflatable crocodile, adrift. It's green and it has a crest, so it
    // answers back. (The big splash sets it rocking.)
    const crocAt = (t) => ({ x: 4.0 + Math.sin(t * 0.11) * 0.2, y: 11.9 + Math.sin(t * 0.17 + 1) * 0.15, a: 2.75 + Math.sin(t * 0.09) * 0.25 });
    R.mover(crocAt, (ctx, t, p) => {
      const c = cyc(t);
      const rock = c > SPLASH && c < SPLASH + 3 ? Math.sin((c - SPLASH) * 8) * 0.1 * (1 - (c - SPLASH) / 3) : 0;
      croc(ctx, p.x, p.y, WZ + 0.04 + Math.sin(t * 1.3) * 0.03 + Math.abs(rock), p.a + rock);
    });
    R.decoy({ id: 'croc', at: (t) => { const p = crocAt(t); return [p.x, p.y, WZ + 0.3]; }, r: 0.9, say: ['An inflatable croc. Not an iguana.', 'Still inflatable.', 'Squeak.'] });

    // ---------- The lifeguard ----------
    R.thing(LGC[0], LGC[1] + 0.4, (ctx) => {
      for (const [lx, ly] of [[LGC[0] - 0.4, LGC[1] - 0.4], [LGC[0] + 0.3, LGC[1] - 0.4], [LGC[0] - 0.4, LGC[1] + 0.3], [LGC[0] + 0.3, LGC[1] + 0.3]]) {
        box(ctx, lx, ly, 0, 0.1, 0.1, 2.0, C.white, { flat: true, lw: 0.03 });
      }
      for (const z of [0.6, 1.3]) face(ctx, [[LGC[0] + 0.35, LGC[1] - 0.4, z], [LGC[0] + 0.35, LGC[1] + 0.4, z]], null, { lw: 0.05 });
      box(ctx, LGC[0] - 0.45, LGC[1] - 0.45, 2.0, 0.9, 0.9, 0.12, INK.funnelRed);
      box(ctx, LGC[0] - 0.45, LGC[1] - 0.45, 2.12, 0.9, 0.12, 0.9, INK.funnelRed);
      lettering(ctx, 'x', LGC[0], LGC[1] + 0.46, 1.0, 'LIFEGUARD', 0.13);
    });
    R.mover(lifeguardAt, (ctx, t, p) => {
      const c = cyc(t);
      const noodle = (a, b) => {
        stick(ctx, a, b, 0.2, INK.flamingo);
      };
      person(ctx, p.x, p.y, p.z, {
        skin: SKIN[3], hair: HAIR[0], style: 'short', top: INK.funnelRed, bottom: INK.funnelRed, hat: 'sun',
        pose: p.pose, dir: p.dir, back: p.back,
        arms: p.hold === 'poke' ? [2.5 + Math.sin(t * 7) * 0.15, 2.2] : p.hold === 'up' ? [0.6, 0.3] : undefined,
        face(c2, hy, back) { if (!back) { c2.fillStyle = MAT.chrome; c2.fillRect(0.22, hy + 0.12, 0.13, 0.07); } },
      }, t);
      if (p.hold === 'poke') {
        const jab = Math.max(0, Math.sin(t * 7));
        const o = tubeAt(U_OPEN);
        const target = [o.x + 0.25, o.y + 0.45, o.z - 0.1];
        const hand = [p.x - 0.2, p.y - 0.2, 1.9];
        noodle(hand, lerp3(hand, target, 0.82 + 0.18 * jab));
      } else if (p.hold === 'up') {
        noodle([p.x + 0.45, p.y + 0.2, 0.2], [p.x + 0.35, p.y + 0.1, 3.6]);
      } else {
        noodle([p.x - 0.5, p.y + 0.3, 1.2], [p.x + 0.6, p.y - 0.4, 1.7]);
      }
    }, { bias: 1 });

    // Everything said here, over everything else (the canopy, the tube and
    // the funnel would otherwise cover the bubbles of the people behind them).
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const c = cyc(t);
      const { riders, big } = crowd(t);
      riders.forEach((p, k) => {
        if (!p || p.hidden || p.kind !== 'queue') return;
        const line = say(LINES.filter((l) => l[0] === k).map((l) => l.slice(1)), c);
        if (line) speech(ctx, p.x, p.y, p.z + 2.7 * (RIDERS[k].look.scale || 1), line, { size: 0.4 });
      });
      const bl = say(BIG_LINES, c);
      if (bl && big) speech(ctx, big.x, big.y, big.z + (big.kind === 'stuck' ? 1.4 : 3.2), bl, { size: 0.42 });
      const g = lifeguardAt(t);
      const gl = say([[28.5, 31, 'Breathe in, sir!'], [35, 38, 'One more poke!'], [42.6, 45, 'Next!']], c);
      if (gl) speech(ctx, g.x, g.y, g.z + (g.pose === 'sit' ? 2.6 : 3), gl, { size: 0.42 });
      if (c >= 44 && c < 47.5) speech(ctx, ATT[0], ATT[1], TOP + 2.6, 'One at a time!', { size: 0.4 });
    });

    // Buckets by the chair, for after.
    R.thing(8.1, 13.1, (ctx) => {
      for (let i = 0; i < 3; i++) bucket(ctx, 8.1, 12.9, i * 0.18, { color: C.sky });
      board(ctx, 'y', 8.45, 12.9, 0.95, 0.9, 0.28, 'FOR AFTER', { board: C.white, size: 0.13 });
    });

    // ---------- The signs ----------
    // The queue sign, the wait on it going up as he stays stuck, and the
    // one rule of the Corkscrew.
    // (Up on tall posts, so the queue in front of it doesn't hide it, and
    // clear of the end of the rope, where the big man comes round.)
    R.thing(3.4, 14.45, (ctx) => {
      for (const x of [2.5, 4.3]) box(ctx, x - 0.05, 14.4, 0, 0.1, 0.1, 3.85, C.ink, { flat: true, stroke: false });
      board(ctx, 'x', 3.4, 14.45, 3.46, 2.1, 0.62, '', { board: INK.funnelRed });
      lettering(ctx, 'x', 3.4, 14.46, 3.61, 'THE CORKSCREW', 0.2, C.white);
      board(ctx, 'x', 3.4, 14.45, 2.65, 2.1, 0.9, '', { board: C.white });
      lettering(ctx, 'x', 3.4, 14.46, 2.93, 'RIDERS MUST BE', 0.14);
      lettering(ctx, 'x', 3.4, 14.46, 2.73, 'THIS WIDE OR LESS', 0.14);
      face(ctx, [[2.95, 14.46, 2.37], [2.95, 14.46, 2.53]], null, { lw: 0.05, stroke: INK.funnelRed });
      face(ctx, [[3.85, 14.46, 2.37], [3.85, 14.46, 2.53]], null, { lw: 0.05, stroke: INK.funnelRed });
      face(ctx, [[2.95, 14.46, 2.45], [3.85, 14.46, 2.45]], null, { lw: 0.02, stroke: INK.funnelRed });
    });
    R.thing(3.4, 14.47, (ctx, t) => {
      const { riders, c } = crowd(t);
      const n = riders.filter((p) => p.kind === 'queue').length;
      const text = c > STUCK_AT + 20 && c < POP ? 'WAIT: A WHILE' : `WAIT: ${Math.max(1, n * 3)} MIN`;
      lettering(ctx, 'x', 3.4, 14.47, 3.31, text, 0.17, INK.sunYellow);
    }, { anim: true });
    // The stern rail's queue line: chrome posts and a sagging red rope.
    R.thing(1.5, 12, (ctx) => {
      const posts = [8.8, 10.6, 12.4, 14.0];
      for (let i = 0; i < posts.length - 1; i++) {
        const a = P(1.5, posts[i], 0.9), b = P(1.5, posts[i + 1], 0.9);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.35, b[0], b[1]);
        if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke(); }
        ctx.strokeStyle = INK.funnelRed; ctx.lineWidth = 0.07; ctx.stroke();
      }
      for (const y of posts) {
        disc(ctx, 1.5, y, 0, 0.18, MAT.chrome, { lw: 0.02 });
        cylinder(ctx, 1.5, y, 0, 0.05, 0.95, MAT.chrome, { flat: true });
      }
    });
    R.decor((ctx) => {
      sternBuoy(ctx, 10.2, 0.62);
      sternBuoy(ctx, 13.4, 0.62);
    });

    // ---------- The stern flag ----------
    R.thing(1.3, 15.45, (ctx) => {
      box(ctx, 1.24, 15.39, 0, 0.12, 0.12, 4.8, C.white, { flat: true, lw: 0.03 });
      disc(ctx, 1.3, 15.45, 4.85, 0.12, MAT.brass, { lw: 0.03 });
    });
    R.air((ctx, t) => {
      // The ship's flag, streaming aft: red, with the knife and fork.
      const n = 8, len = 2.1, top = 4.7, h = 1.2;
      const pt = (k, v) => {
        const w = Math.sin(t * 6 - k * 4) * 0.22 * k;
        return P(1.3 - k * len, 15.45 + w, top - v * h + Math.sin(t * 4 - k * 3) * 0.08 * k);
      };
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const [X, Y] = pt(i / n, 0); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      for (let i = n; i >= 0; i--) { const [X, Y] = pt(i / n, 1); ctx.lineTo(X, Y); }
      ctx.closePath();
      paint(ctx, INK.funnelRed, { lw: 0.04 });
      if (Q.detail) {
        const [X, Y] = pt(0.45, 0.5);
        crest(ctx, X, Y, 0.75, C.white, INK.funnelRed);
      }
    });

    // ---------- Mini golf ----------
    // Hole 9: an iceberg, and a little ship that didn't aim left.
    R.thing(11.0, 11.6, (ctx) => {
      const cx = 11.0, cy = 11.4;
      face(ctx, [[cx - 0.8, cy + 0.3, 0.02], [cx - 0.2, cy + 0.1, 1.3], [cx + 0.1, cy - 0.2, 0.9], [cx + 0.7, cy - 0.3, 0.02]], C.white, { lw: 0.03 });
      face(ctx, [[cx - 0.8, cy + 0.3, 0.02], [cx - 0.2, cy + 0.1, 1.3], [cx + 0.2, cy + 0.6, 0.02]], tint(C.sky, 0.3), { lw: 0.03, dots: C.sky, density: 0.3 });
      face(ctx, [[cx + 0.2, cy + 0.6, 0.02], [cx - 0.2, cy + 0.1, 1.3], [cx + 0.1, cy - 0.2, 0.9], [cx + 0.7, cy - 0.3, 0.02]], C.sky, { lw: 0.03 });
      // The toy ship, nose into it.
      box(ctx, cx + 0.5, cy + 0.35, 0.02, 0.9, 0.3, 0.22, INK.hullWhite, { flat: true, lw: 0.02 });
      box(ctx, cx + 0.9, cy + 0.42, 0.24, 0.14, 0.14, 0.22, INK.funnelRed, { flat: true, lw: 0.02 });
      // (Its sign narrow and to the right: clear of the lifeguard when he
      // pokes, and of the windmill's roof.)
      const sx = cx + 0.15;
      board(ctx, 'x', sx, 10.5, 1.2, 1.1, 0.5, '', { board: C.white });
      lettering(ctx, 'x', sx, 10.5, 1.3, 'HOLE 9: ICEBERG', 0.11);
      lettering(ctx, 'x', sx, 10.5, 1.1, 'AIM LEFT', 0.12);
      face(ctx, [[sx, 10.5, 0], [sx, 10.5, 0.95]], null, { lw: 0.05 });
    });
    // Hole flags.
    for (const [x, y, color] of [[11.1, 13.7, INK.sunYellow], [12.4, 11.1, INK.flamingo]]) {
      R.thing(x, y, (ctx) => {
        face(ctx, [[x, y, 0], [x, y, 1.3]], null, { lw: 0.04 });
        face(ctx, [[x, y, 1.3], [x + 0.45, y, 1.15], [x, y, 1.0]], color, { lw: 0.02 });
      });
    }
    // Hole 18: the windmill, sails turning across its door.
    const WM = { x: 13.6, y: 12.0, z: 1.9 };
    R.thing(WM.x, WM.y + 0.5, (ctx) => {
      box(ctx, WM.x - 0.5, WM.y - 0.5, 0, 1.0, 1.0, 2.1, INK.hullWhite, { dotsL: shade(INK.hullWhite, 0.4) });
      face(ctx, [[WM.x - 0.6, WM.y - 0.6, 2.1], [WM.x + 0.6, WM.y - 0.6, 2.1], [WM.x, WM.y, 3.0]], shade(INK.funnelRed, 0.1), { lw: 0.03 });
      face(ctx, [[WM.x + 0.6, WM.y - 0.6, 2.1], [WM.x + 0.6, WM.y + 0.6, 2.1], [WM.x, WM.y, 3.0]], INK.funnelRed, { lw: 0.03 });
      face(ctx, [[WM.x - 0.6, WM.y + 0.6, 2.1], [WM.x + 0.6, WM.y + 0.6, 2.1], [WM.x, WM.y, 3.0]], shade(INK.funnelRed, 0.2), { lw: 0.03 });
      // Its door on the side facing the tee.
      face(ctx, [[WM.x + 0.51, WM.y - 0.2, 0], [WM.x + 0.51, WM.y + 0.2, 0], [WM.x + 0.51, WM.y + 0.2, 0.45], [WM.x + 0.51, WM.y - 0.2, 0.45]], C.ink, { lw: 0.02 });
      board(ctx, 'y', WM.x + 0.52, WM.y, 1.3, 0.9, 0.42, '', { board: C.white });
      lettering(ctx, 'y', WM.x + 0.53, WM.y, 1.38, 'HOLE 18', 0.1);
      lettering(ctx, 'y', WM.x + 0.53, WM.y, 1.2, 'PAR 3. RECORD 41.', 0.07);
    });
    R.thing(WM.x + 0.6, WM.y + 0.6, (ctx, t) => {
      const a0 = t * 1.3;
      for (let i = 0; i < 4; i++) {
        const a = a0 + (i * Math.PI) / 2;
        const c = Math.cos(a), s = Math.sin(a), pc = Math.cos(a + 0.28), ps = Math.sin(a + 0.28);
        const x = WM.x + 0.62;
        face(ctx, [[x, WM.y + c * 0.15, WM.z + s * 0.15], [x, WM.y + c * 1.25, WM.z + s * 1.25], [x, WM.y + pc * 1.25, WM.z + ps * 1.25], [x, WM.y + pc * 0.3, WM.z + ps * 0.3]], i % 2 ? C.white : MAT.canvas, { lw: 0.025 });
      }
      disc(ctx, WM.x + 0.64, WM.y, WM.z, 0.1, C.ink, { stroke: false });
    }, { anim: true });
    // The golfer at 18, and his ball, which the windmill sends back every time.
    const golf = (t) => (t % 9 + 9) % 9;
    R.thing(15.0, 12.6, (ctx, t) => {
      const g = golf(t);
      const swing = g < 1 ? Math.sin(g * Math.PI) * 0.6 : 0;
      const cross = g > 4 && g < 7;
      person(ctx, 15.0, 12.6, 0.02, {
        ...folk(77), skin: qz(folk(77).skin, green(t, 120)), hat: 'sun', top: INK.sunYellow, bottom: C.white, dress: false,
        pose: cross ? 'point' : 'stand', dir: 'l', arms: cross ? [1.6 + Math.sin(t * 9) * 0.2, 0.2] : [0.5 + swing, 0.5 + swing],
        hold: cross ? undefined : (c) => { c.beginPath(); c.moveTo(0, 0); c.lineTo(-0.1 - swing * 0.4, 1.3); c.strokeStyle = C.ink; c.lineWidth = 0.05; c.stroke(); c.fillStyle = MAT.chrome; c.fillRect(-0.3 - swing * 0.4, 1.25, 0.25, 0.08); },
      }, t);
      if (Q.detail && cross && Math.floor(t / 9) % 2) speech(ctx, 15.0, 12.6, 3.0, 'Every time!', { size: 0.4 });
    }, { anim: true });
    R.mover((t) => {
      const g = golf(t);
      const B0 = [14.7, 12.4], B1 = [14.2, 12.1], B2 = [14.8, 12.55];
      if (g < 1) return { x: B0[0], y: B0[1] };
      if (g < 2.4) { const k = (g - 1) / 1.4; return { x: lerp(B0[0], B1[0], k), y: lerp(B0[1], B1[1], k) }; }
      if (g < 3.8) { const k = 1 - Math.pow(1 - (g - 2.4) / 1.4, 2); return { x: lerp(B1[0], B2[0], k), y: lerp(B1[1], B2[1], k) }; }
      return { x: B2[0], y: B2[1] };
    }, (ctx, t, p) => { disc(ctx, p.x, p.y, 0.1, 0.09, C.white, { lw: 0.02 }); });

    // A kid at the tee whose ball goes over the side every time.
    const kidg = (t) => ((t + 3) % 11 + 11) % 11;
    R.thing(12.3, 14.1, (ctx, t) => {
      const g = kidg(t);
      const look = folk(58, { top: C.sky, bottom: C.coral, hat: 'cap', scale: 0.72 });
      const watch = g > 1.2 && g < 6;
      person(ctx, 12.3, 14.1, 0.02, {
        ...look, pose: watch ? 'point' : 'stand', dir: 'l', arms: watch ? [1.4, 0.2] : [0.6, 0.6],
        hold: watch ? undefined : (c) => { c.beginPath(); c.moveTo(0, 0); c.lineTo(0.1, 0.95); c.strokeStyle = C.ink; c.lineWidth = 0.05; c.stroke(); c.fillStyle = INK.flamingo; c.fillRect(0.02, 0.9, 0.22, 0.07); },
      }, t);
      if (Q.detail && g > 2.6 && g < 4.6) speech(ctx, 12.3, 14.1, 2.2, 'Fore!', { size: 0.38 });
    }, { anim: true });
    R.mover((t) => {
      const g = kidg(t);
      if (g < 1) return { x: 12.55, y: 14.35, z: 0.1 };
      if (g < 2.2) { const k = (g - 1) / 1.2; return { x: 12.55 + k * 0.35, y: 14.35 + k * 1.75, z: 0.1 }; }
      if (g < 2.8) { const k = (g - 2.2) / 0.6; return { x: 12.9 + k * 0.1, y: 16.1 + k * 0.4, z: 0.1 - k * k * 2.2 }; }
      return { x: 12.9, y: 16.5, z: -3, hidden: true };
    }, (ctx, t, p) => { if (!p.hidden) disc(ctx, p.x, p.y, p.z, 0.09, INK.flamingo, { lw: 0.02 }); });
    // (Painted on the carpet: a board here stood behind the riders walking
    // off to the Pool, or beside the Pool's lounger sign.)
    R.rug((ctx) => {
      textFloor(ctx, 14.1, 13.6, 'BALLS LOST AT SEA', 0.17, alpha(C.white, 0.85));
      textFloor(ctx, 14.1, 14.05, 'THIS CRUISE: 1,207', 0.17, alpha(C.white, 0.85));
    });

    // A gull overhead, working the stern for chips.
    R.air((ctx, t) => {
      const a = (t / 17) * Math.PI * 2;
      const x = 6 + Math.cos(a) * 5, y = 7 + Math.sin(a) * 3.5;
      gull(ctx, x, y, 12.3 + Math.sin(t * 0.8) * 0.4, t, { fly: true, dir: -Math.sin(a) * 5 - Math.cos(a) * 3.5 >= 0 ? 'r' : 'l', phase: 3 });
    });
  },
};
