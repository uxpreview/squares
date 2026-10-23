// Dev and QA: the building's right-hand end. Standing desks at every height,
// hoodies on every chair, a server closet that runs warm, and the big deploy
// screen under a sign that says NO DEPLOYS ON FRIDAYS. QA's corner at the
// front, with its bug board, a box of everything Priya has broken, and Priya
// on a chair testing the ceiling. Dev stay till midnight.
//
// Running gags: the deploy creeps up all day, hits 99% at five to five,
// rolls back and starts again (pizza at eight, still going at midnight); QA
// files a bug on everything she touches, so tickets turn up on things all
// day, the bear included (BUG #412). And Dana's stand-up lands on the first
// bear o'clock: the back pod stand round her craning at the window.
//
// The area's chunks meet at x 96 and y 16 (zone.js, chunksOf): anything wide
// and tall keeps a unit clear, and what stands on the duck desk (which runs
// over y 16) is drawn by the front chunk, with the desk.
import { C, Q, box, face, paint, paintText, person, folk, alpha, tint, shade, mix, speech, cylinder, goose as drawGoose, label, P, HAIR } from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { INK, TONE, CHAIR } from '../style.js';
import { floorOf, backWall, sill, pod, staff, screen, drawDesk, drawChair, clutter, mug, papers, plant } from '../kit.js';
import { bearOClock, H, dev, rushK, seated, nightK, LOOP } from '../clock.js';

// The deploy's progress: up all day, stuck at 99% from about 4:45, rolled
// back at 4:55, and on again into the night.
export function deploy(t) {
  const h = H(t);
  if (h < 8.5) return 0;
  if (h < 16.92) return Math.min(99, Math.floor(((h - 8.5) / 8.25) * 99));
  return Math.min(99, Math.floor(((h - 16.92) / 8) * 60));
}
function deployWord(t) {
  const h = H(t);
  if (h < 8.5) return 'QUEUED';
  if (h >= 16.92 && h < 17.2) return 'ROLLING BACK';
  return 'DEPLOYING';
}

const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// ---------- Little helpers ----------
// Draw on a face along x (toward +y) or along y (toward +x), centered at
// (x, y, z), in world units: u runs left to right as we see it, v down.
function plane(ctx, along, x, y, z, fn) {
  ctx.save();
  if (along === 'x') ctx.transform(1, 0.5, 0, ZK, x - y, (x + y) / 2 - z * ZK);
  else ctx.transform(1, -0.5, 0, ZK, x - y, (x + y) / 2 - z * ZK);
  fn(ctx);
  ctx.restore();
}
// Words in a plane's units.
function txt(ctx, s, u, v, size, color, align = 'center', font = 'Rethink Sans', weight = 700) {
  ctx.save();
  ctx.translate(u, v);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${weight} ${size * 40}px "${font}", "Arial Black", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}
function prect(ctx, u0, v0, w, h, fill, o = {}) {
  ctx.beginPath();
  ctx.rect(u0, v0, w, h);
  paint(ctx, fill, { lw: 0.02, ...o });
}
// One of QA's tickets: a sticky square saying BUG and its number.
function ticket(ctx, along, x, y, z, num, col = INK.sticky) {
  plane(ctx, along, x, y, z, (g) => {
    prect(g, -0.17, -0.17, 0.34, 0.34, col);
    if (Q.detail) {
      txt(g, 'BUG', 0, -0.07, 0.1, C.ink);
      txt(g, '#' + num, 0, 0.07, 0.1, C.red);
    }
  });
}
// Walk a path of [x, y] points, k from 0 to 1; returns [x, y, dx, dy].
function along(pts, k) {
  const seg = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let d = clamp(k) * L;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const u = seg[i] ? Math.min(1, d / seg[i]) : 1, [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      return [ax + (bx - ax) * u, ay + (by - ay) * u, bx - ax, by - ay];
    }
    d -= seg[i];
  }
  return [...pts[pts.length - 1], 0, 0];
}
const pathLen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// Hoodies and headphones, for people's looks (person's wear and face).
function hoodie(color) {
  return (ctx, b) => {
    if (b.dress) return;
    ctx.beginPath(); ctx.ellipse(-0.06, b.top + 0.04, 0.22, 0.11, 0, 0, Math.PI * 2);
    paint(ctx, shade(color, 0.18), { lw: 0.03 });
    if (b.back || !Q.detail) return;
    ctx.beginPath(); ctx.roundRect(-0.17, b.hipY - 0.32, 0.36, 0.17, 0.05);
    paint(ctx, shade(color, 0.12), { lw: 0.025 });
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0.05, b.top + 0.1); ctx.lineTo(0.04, b.top + 0.32); ctx.moveTo(0.16, b.top + 0.1); ctx.lineTo(0.17, b.top + 0.3); ctx.stroke();
  };
}
function headphones(color) {
  return (ctx, hy) => {
    ctx.beginPath(); ctx.arc(0.02, hy, 0.37, Math.PI * 1.1, Math.PI * 1.9);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-0.08, hy + 0.04, 0.1, 0.14, 0, 0, Math.PI * 2);
    paint(ctx, color, { lw: 0.03 });
  };
}
const HOOD = [C.navy, C.grey, C.green, C.black, C.purple, C.teal, C.red, shade(C.grey, 0.35), C.mustard, C.coral];
const devLook = (seed, i, o = {}) => folk(seed, { dress: false, top: HOOD[i % HOOD.length], wear: hoodie(HOOD[i % HOOD.length]), ...o });

// A hoodie left over the back of an office chair (kit's chair: its back is
// on the side away from the desk).
function chairHoodie(R, s, color) {
  const away = s.side === 'r' ? 1 : -1, bx = s.x + away * 0.3;
  R.thing(s.x + away * 0.4 + 0.01, s.y + 0.02, (ctx) => {
    box(ctx, bx - 0.09, s.y - 0.31, 1.12, 0.18, 0.62, 0.3, color, { flat: true, lw: 0.025 });
    box(ctx, bx - 0.04, s.y + 0.18, 0.66, 0.08, 0.14, 0.48, shade(color, 0.08), { flat: true, lw: 0.02 });
    const [X, Y] = P(bx, s.y - 0.05, 1.42);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.2, 0.1, 0, Math.PI, 0); paint(ctx, shade(color, 0.15), { lw: 0.02 });
  });
}

// ---------- Where things are ----------
const BPOD = 92; // the back pod's divider line
// The back pod: standing desks, each at its own height. The third is cranked
// right down and its owner sits on a yoga ball; the fourth is up as far as it
// goes, for the tallest dev in New England.
const BACK_SEATS = [
  { x: 90, y: 1.3, side: 'l', dir: 'r', h: 1.4, kind: null, stand: [90.35, 1.3], path: [[90.35, 1.3], [90.2, 10.4], [92.7, 12.55]] },
  { x: 94, y: 1.3, side: 'r', dir: 'l', h: 1.3, kind: 'code', stand: [93.65, 1.3], path: [[93.65, 1.3], [93.8, 7.6], [95.5, 12.1]] },
  { x: 90, y: 3.1, side: 'l', dir: 'r', h: 0.95, kind: null, ball: true, stand: [90.0, 3.1], path: [[90.35, 3.1], [90.2, 10.4], [94.6, 11.25]] },
  { x: 94, y: 3.1, side: 'r', dir: 'l', h: 1.75, kind: 'terminal', tall: true, stand: [93.65, 3.1], path: [[93.65, 3.1], [93.8, 7.6], [95.8, 13.6]] },
];
const CEO_AT = [94, 13];
// Dana's stand-up (clock.js: she's at 94, 13 from about 68 to 89).
const UP_GO = 64, UP_BACK = 87.3, UP_SPEED = 2.4;

const CLOSET = { x0: 100.2, y0: 0.4, x1: 103.6, y1: 4.4, h: 2.8, door: [100.95, 102.25] };
const SCREEN_X = [96.9, 101.7], SCREEN_Y = 8.45; // the deploy screen, clear of the seam at x 96
const DUCK_DESK = [90.6, 14.6, 4, 1.6];
const SHELF = [96.8, 15.0, 1.5, 0.6, 1.0];
const PRI = [98.8, 20.6], PRI_GLASS = [101.0, 25.15];
const BOARD = { x: 101.6, y0: 18.8, y1: 22.8 };
const TABLE = [101.3, 10.3, 1.8, 1.0, 1.0];

// The tickets QA puts on things, an hour at a time: [hour, plane, x, y, z,
// number, depth of what it's stuck to, chunk spot].
const TICKETS = [
  [9.0, 'x', 90.95, 16.22, 0.92, '302', 108.85, [92.6, 16.21]],
  [9.6, 'y', 88.8, 6.45, 1.15, '305', 98.45, [88.8, 9.6]],
  [10.4, 'x', 97.36, 8.69, 0.7, '311', 108.3, [99.3, 8.95]],
  [11.0, 'x', 98.0, 15.62, 0.5, '318', 113.2, [97.55, 15.6]],
  [13.0, 'x', 90.0, 3.48, 0.38, '356', 93.2, [90.0, 3.1]],
  [13.5, 'x', 102.4, 25.66, 0.55, '371', 129.0, [102.4, 25.7]],
  [14.5, 'x', 99.45, 5.52, 0.25, '377', 104.8, [99.4, 5.3]],
];

export default {
  id: 'dev-qa',
  name: 'Dev and QA',
  blurb: 'NO DEPLOYS ON FRIDAYS, says the sign over the deploy. QA has filed a bug about the bear.',
  describe: 'The developers\' end of the top floor: standing desks at every height, hoodies on the chairs, a humming server closet and a big screen whose progress bar creeps along all day. In the testing corner a tester on a chair files bugs on everything. After dark, pizza, and the developers stay.',

  build(R) {
    floorOf(R, 88, 104, { floor: TONE['dev-qa'], end: true, name: 'DEV AND QA', nameAt: [95, 13.2] });
    backWall(R, 88, 104);
    sill(R, 88, 104, { end: true });

    // ---------- On the floor ----------
    R.rug((ctx) => {
      // Cables from the closet to the desks and the screen, taped down
      // nowhere.
      ctx.save();
      ctx.lineCap = 'round';
      const cable = (pts, col) => {
        ctx.beginPath();
        ctx.moveTo(...P(...pts[0], 0));
        for (let i = 1; i + 2 < pts.length + 1; i += 3) ctx.bezierCurveTo(...P(...pts[i], 0), ...P(...pts[i + 1], 0), ...P(...pts[i + 2], 0));
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 0.045; ctx.stroke();
      };
      cable([[100.6, 4.5], [98.5, 5.6], [96.5, 3.6], [93.6, 4.0]], C.mustard);
      cable([[100.9, 4.5], [99.5, 7.2], [97.8, 6.0], [98.2, 8.5]], C.coral);
      cable([[101.2, 4.5], [102.5, 6.5], [100.4, 9.5], [101.7, 10.4]], C.sky);
      ctx.restore();
      // Where Dana stands for the stand-up, in tape.
      ctx.save();
      ctx.strokeStyle = alpha(INK.sticky, 0.85); ctx.lineWidth = 0.08;
      const [cx, cy] = CEO_AT;
      ctx.beginPath();
      ctx.moveTo(...P(cx - 0.55, cy - 0.55, 0)); ctx.lineTo(...P(cx + 0.55, cy - 0.55, 0)); ctx.lineTo(...P(cx + 0.55, cy + 0.55, 0)); ctx.lineTo(...P(cx - 0.55, cy + 0.55, 0)); ctx.closePath();
      ctx.stroke();
      ctx.restore();
      paintText(ctx, 'floor', cx + 0.2, cy + 0.95, 'STAND-UP', 0.26, alpha(INK.sticky, 0.9));
    });

    // ---------- The back pod: standing desks, and Dana's stand-up ----------
    BACK_SEATS.forEach((b, j) => {
      const w = 1.25, d = 1.7;
      const x0 = b.side === 'l' ? BPOD - w - 0.06 : BPOD + 0.06, y0 = b.y - d / 2;
      R.thing(x0 + w / 2, y0 + d, (ctx) => {
        const leg = shade(C.greyLight, 0.18);
        for (const yy of [y0 + 0.18, y0 + d - 0.3]) {
          box(ctx, x0 + 0.12, yy - 0.04, 0, w - 0.24, 0.14, 0.05, leg, { flat: true, lw: 0.02 });
          box(ctx, x0 + w / 2 - 0.06, yy, 0.05, 0.12, 0.12, b.h - 0.11, leg, { flat: true, lw: 0.025 });
        }
        box(ctx, x0, y0, b.h - 0.06, w, d, 0.06, C.white, { flat: true, lw: 0.035 });
        // The up and down buttons, and the height it's at.
        if (Q.detail && b.side === 'r') {
          box(ctx, x0 + w - 0.02, y0 + d - 0.42, b.h - 0.16, 0.04, 0.26, 0.09, C.ink, { flat: true, stroke: false });
        }
      });
      const seat = { x: b.x, y: b.y, dir: b.dir, side: b.side, cx: BPOD, mon: [b.side === 'l' ? BPOD - 0.4 : BPOD + 0.4, b.y, b.h], top: [b.side === 'l' ? BPOD - 0.95 : BPOD + 0.95, b.y + (j > 1 ? 0.45 : -0.45), b.h] };
      screen(R, seat, b.kind || 'code', { here: dev });
      clutter(R, seat, 600 + j);
      // The yoga ball.
      if (b.ball) R.thing(b.x, b.y, (ctx) => {
        const [X, Y] = P(b.x, b.y, 0.36);
        ctx.beginPath(); ctx.arc(X, Y, 0.4, 0, Math.PI * 2); paint(ctx, C.pink, { dots: shade(C.pink, 0.4), density: 0.15 });
        ctx.beginPath(); ctx.ellipse(X - 0.12, Y - 0.15, 0.1, 0.06, -0.5, 0, Math.PI * 2); ctx.fillStyle = alpha(C.white, 0.6); ctx.fill();
      });
    });
    // The back pod's devs, in headphones: deep in the deploy, they don't hear
    // the shout at bear o'clock. Except in the morning, when Dana's stand-up
    // gets them up, and the bear turns up halfway through it.
    BACK_SEATS.forEach((b, j) => {
      const look = devLook(580 + j, j, { face: headphones([C.coral, C.mustard, C.teal, C.white][j]), scale: b.tall ? 1.14 : 1, style: ['short', 'curly', 'pony', 'short'][j] });
      const L = pathLen(b.path), dur = L / UP_SPEED;
      const go = UP_GO + j * 0.7, back = UP_BACK + j * 0.4;
      const spot = b.path[b.path.length - 1];
      R.mover((t) => {
        if (!dev(t)) return { x: b.x, y: b.y, gone: true };
        const s = wrap(t);
        if (s >= go && s < go + dur) { const [x, y, dx, dy] = along(b.path, (s - go) / dur); return { x, y, moving: true, dir: dx - dy > 0 ? 'r' : 'l', back: false }; }
        if (s >= go + dur && s < back) return { x: spot[0], y: spot[1], up: true };
        if (s >= back && s < back + dur) { const [x, y, dx, dy] = along([...b.path].reverse(), (s - back) / dur); return { x, y, moving: true, dir: dx - dy > 0 ? 'r' : 'l', back: dx + dy < 0 }; }
        return { x: b.stand[0], y: b.stand[1], desk: true };
      }, (ctx, t, p) => {
        if (p.gone) return;
        if (p.moving) { person(ctx, p.x, p.y, 0, { ...look, pose: 'walk', dir: p.dir, back: p.back }, t); return; }
        if (p.up) {
          // In the circle round Dana, facing her; at bear o'clock they sneak
          // looks at the window, one at a time.
          const crane = bearOClock(t) && Math.sin(t * 0.8 + j * 1.9) > 0.35;
          const face = p.x < CEO_AT[0] - 0.2 ? 'r' : 'l';
          const pose = crane && j % 2 ? 'point' : 'stand';
          person(ctx, p.x, p.y, 0, { ...look, pose, dir: crane ? 'l' : face, speed: 4 }, t);
          return;
        }
        if (b.ball) {
          person(ctx, p.x, p.y, 0.28 + Math.abs(Math.sin(t * 2.6)) * 0.05, { ...look, pose: 'sit', dir: b.dir, arms: [0.95 + Math.sin(t * 13) * 0.08, 0.9 - Math.sin(t * 11) * 0.08] }, t);
          return;
        }
        person(ctx, p.x, p.y, 0, { ...look, pose: 'read', dir: b.dir, arms: [1.0 + Math.sin(t * 14 + j) * 0.08, 0.95 - Math.sin(t * 12 + j) * 0.08] }, t);
      }, { bias: 0.15 });
    });

    // ---------- The whiteboard of arrows nobody understands ----------
    {
      const x = 88.7, y0 = 6.0, y1 = 9.6;
      R.thing(x + 0.1, y1, (ctx) => {
        const post = shade(C.greyLight, 0.25);
        for (const y of [y0, y1 - 0.08]) {
          box(ctx, x - 0.3, y - 0.04, 0.12, 0.7, 0.12, 0.05, post, { flat: true, lw: 0.02 });
          box(ctx, x, y, 0.15, 0.08, 0.08, 2.3, post, { flat: true, lw: 0.02 });
          for (const dx of [-0.25, 0.3]) { const [X, Y] = P(x + dx, y + 0.02, 0.06); ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); }
        }
        box(ctx, x - 0.02, y0, 0.85, 0.1, y1 - y0, 1.55, C.white, { flat: true, lw: 0.035 });
        box(ctx, x + 0.08, y0 + 0.3, 0.85, 0.12, y1 - y0 - 0.6, 0.06, C.grey, { flat: true, lw: 0.02 });
        plane(ctx, 'y', x + 0.085, (y0 + y1) / 2, 1.62, (g) => {
          g.lineCap = 'round'; g.lineJoin = 'round';
          txt(g, 'THE ARCHITECTURE', -0.9, -0.6, 0.15, C.navy, 'center');
          txt(g, '(DO NOT ERASE)', 0.95, -0.6, 0.12, C.red, 'center');
          const boxAt = (u, v, w, s, col) => { g.beginPath(); g.rect(u - w / 2, v - 0.14, w, 0.28); g.strokeStyle = col; g.lineWidth = 0.035; g.stroke(); txt(g, s, u, v, 0.13, col); };
          boxAt(-1.25, -0.2, 0.6, 'API', C.navy);
          boxAt(1.15, -0.25, 0.5, 'DB', C.teal);
          boxAt(-1.2, 0.45, 0.7, 'AUTH', C.navy);
          txt(g, '???', 0.05, 0.12, 0.2, C.red);
          // A cloud that says MAGIC.
          g.beginPath();
          for (const [cu, cv, r] of [[0.95, 0.42, 0.14], [1.15, 0.36, 0.17], [1.38, 0.43, 0.13], [1.15, 0.5, 0.14]]) { g.moveTo(cu + r, cv); g.arc(cu, cv, r, 0, Math.PI * 2); }
          g.fillStyle = C.white; g.fill(); g.strokeStyle = C.purple; g.lineWidth = 0.03; g.stroke();
          txt(g, 'MAGIC', 1.15, 0.43, 0.1, C.purple);
          const arrow = (pts, col) => {
            g.beginPath(); g.moveTo(...pts[0]);
            if (pts.length === 3) g.quadraticCurveTo(...pts[1], ...pts[2]); else g.lineTo(...pts[1]);
            g.strokeStyle = col; g.lineWidth = 0.03; g.stroke();
            const [ex, ey] = pts[pts.length - 1], [px, py] = pts[pts.length - 2], a = Math.atan2(ey - py, ex - px);
            g.beginPath(); g.moveTo(ex - Math.cos(a - 0.5) * 0.1, ey - Math.sin(a - 0.5) * 0.1); g.lineTo(ex, ey); g.lineTo(ex - Math.cos(a + 0.5) * 0.1, ey - Math.sin(a + 0.5) * 0.1); g.stroke();
          };
          arrow([[-0.95, -0.2], [-0.2, -0.45], [0.85, -0.28]], C.navy);
          arrow([[0.9, -0.15], [0.4, 0.05], [0.25, 0.1]], C.teal);
          arrow([[-0.15, 0.15], [-0.6, 0.15], [-0.85, 0.4]], C.red);
          arrow([[-1.2, 0.3], [-1.6, 0.05], [-1.3, -0.06]], C.green);
          arrow([[0.2, 0.25], [0.5, 0.65], [0.95, 0.5]], C.red);
          arrow([[1.3, 0.25], [1.6, 0.0], [1.3, -0.12]], C.purple);
          // Somebody's loop, round and round.
          g.beginPath(); g.arc(-0.35, 0.55, 0.12, 0.3, Math.PI * 1.9); g.strokeStyle = C.navy; g.lineWidth = 0.03; g.stroke();
        });
      });
    }

    // ---------- The server closet: warm, humming, blinking ----------
    const closet = R.poke({ id: 'servers', at: [101.6, 4.45, 1.1], r: 0.9, say: 'Warm in here. Something is nesting.' });
    {
      const { x0, y0, x1, y1, h, door } = CLOSET;
      const wall = tint(C.greyLight, 0.35);
      R.thing(101.9, 2.4, (ctx) => {
        box(ctx, x0, y0, 0, x1 - x0, y1 - y0, h, wall, { flat: true, lw: 0.045, top: tint(wall, 0.2) });
        // A vent on the roof, and the door's frame.
        box(ctx, x0 + 1.2, y0 + 1.4, h, 1.0, 1.0, 0.18, C.grey, { flat: true, lw: 0.025 });
        face(ctx, [[door[0] - 0.08, y1 + 0.005, 0], [door[1] + 0.08, y1 + 0.005, 0], [door[1] + 0.08, y1 + 0.005, 2.3], [door[0] - 0.08, y1 + 0.005, 2.3]], shade(wall, 0.4), { lw: 0.03 });
        plane(ctx, 'x', (door[0] + door[1]) / 2, y1 + 0.01, 2.5, (g) => txt(g, 'SERVERS', 0, 0, 0.2, C.ink));
        // The vent grille left of the door (its lights blink: below).
        face(ctx, [[x0 + 0.12, y1 + 0.01, 1.1], [x0 + 0.62, y1 + 0.01, 1.1], [x0 + 0.62, y1 + 0.01, 2.1], [x0 + 0.12, y1 + 0.01, 2.1]], C.black, { lw: 0.025 });
        // DAYS SINCE LAST INCIDENT: 0.
        face(ctx, [[door[1] + 0.22, y1 + 0.01, 1.15], [x1 - 0.12, y1 + 0.01, 1.15], [x1 - 0.12, y1 + 0.01, 2.15], [door[1] + 0.22, y1 + 0.01, 2.15]], C.white, { lw: 0.025 });
        plane(ctx, 'x', (door[1] + 0.22 + x1 - 0.12) / 2, y1 + 0.015, 1.65, (g) => {
          txt(g, 'DAYS SINCE', 0, -0.36, 0.11, C.ink);
          txt(g, 'LAST INCIDENT', 0, -0.23, 0.11, C.ink);
          txt(g, '0', 0, 0.12, 0.5, C.red, 'center', 'Rethink Sans', 800);
        });
      });
      // The door (and what's behind it), the blinking lights, and the heat.
      R.thing(101.65, 4.42, (ctx, t) => {
        const k = closet.k();
        const blink = (u0, v0, cols, rows, seed, z0, xs) => {
          for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
            const on = Math.sin(t * (3 + ((c * 7 + r * 3 + seed) % 5)) + c * 1.3 + r * 2.1) > 0.1;
            const col = on ? [C.leaf, C.leaf, C.mustard, C.leaf, C.coral][(c + r * 2 + seed) % 5] : shade(C.green, 0.6);
            const xx = u0 + c * xs, zz = z0 + r * 0.16;
            face(ctx, [[xx, y1 + 0.02, zz], [xx + 0.06, y1 + 0.02, zz], [xx + 0.06, y1 + 0.02, zz + 0.05], [xx, y1 + 0.02, zz + 0.05]], col, { stroke: false });
          }
        };
        blink(x0 + 0.18, 0, 4, 6, 1, 1.18, 0.11);
        if (k > 0.02) {
          // Inside: racks, lights, and a router that's lovely and warm.
          face(ctx, [[door[0], y1 + 0.01, 0], [door[1], y1 + 0.01, 0], [door[1], y1 + 0.01, 2.2], [door[0], y1 + 0.01, 2.2]], C.black, { lw: 0.03 });
          ctx.save(); ctx.globalAlpha *= 0.35 * k;
          face(ctx, [[door[0], y1 + 0.015, 0], [door[1], y1 + 0.015, 0], [door[1], y1 + 0.015, 1.1], [door[0], y1 + 0.015, 1.1]], C.coral, { stroke: false });
          ctx.restore();
          blink(door[0] + 0.12, 0, 9, 7, 3, 1.05, 0.12);
          box(ctx, 101.2, 4.05, 0.45, 0.9, 0.45, 0.28, C.ink, { flat: true, lw: 0.03, top: shade(C.grey, 0.4) });
          for (const ax of [101.3, 101.95]) { const [X, Y] = P(ax, 4.1, 0.73); ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + (ax > 101.5 ? 0.12 : -0.1), Y - 0.45); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke(); }
          for (let i = 0; i < 4; i++) { const [X, Y] = P(101.3 + i * 0.18, 4.5, 0.6); ctx.fillStyle = Math.sin(t * 9 + i * 2) > 0 ? C.leaf : C.green; ctx.fillRect(X - 0.03, Y - 0.03, 0.06, 0.06); }
        }
        // The door swings out on its left hinge.
        const a = k * 1.75, L = door[1] - door[0];
        const ex = door[0] + Math.cos(a) * L, ey = y1 + 0.02 + Math.sin(a) * L;
        const doorC = tint(C.grey, 0.25);
        face(ctx, [[door[0], y1 + 0.02, 0], [ex, ey, 0], [ex, ey, 2.2], [door[0], y1 + 0.02, 2.2]], k > 0.5 ? shade(doorC, 0.1) : doorC, { lw: 0.035 });
        if (k < 0.15) {
          // Shut: a little window of lights, the handle, a warm line under
          // it, and QA's ticket from last month.
          face(ctx, [[door[0] + 0.3, y1 + 0.03, 1.45], [door[1] - 0.3, y1 + 0.03, 1.45], [door[1] - 0.3, y1 + 0.03, 1.95], [door[0] + 0.3, y1 + 0.03, 1.95]], C.black, { lw: 0.025 });
          blink(door[0] + 0.38, 0, 5, 3, 2, 1.52, 0.12);
          box(ctx, door[1] - 0.22, y1 + 0.03, 1.0, 0.1, 0.06, 0.05, C.ink, { flat: true, stroke: false });
          ctx.save(); ctx.globalAlpha *= 0.55 + Math.sin(t * 2) * 0.2;
          face(ctx, [[door[0], y1 + 0.04, 0], [door[1], y1 + 0.04, 0], [door[1], y1 + 0.04, 0.05], [door[0], y1 + 0.04, 0.05]], C.coral, { stroke: false });
          ctx.restore();
          ticket(ctx, 'x', door[0] + 0.35, y1 + 0.04, 1.15, '288', C.pink);
        }
        // Heat coming off the roof.
        if (Q.detail) {
          ctx.save();
          ctx.strokeStyle = alpha(C.coral, 0.45); ctx.lineWidth = 0.04; ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const ph = (t * 0.5 + i / 3) % 1, [X, Y] = P(x0 + 1.0 + i * 0.7, y0 + 2.2, h + 0.3 + ph * 0.9);
            ctx.globalAlpha = 1 - ph;
            ctx.beginPath(); ctx.moveTo(X, Y + 0.3);
            ctx.bezierCurveTo(X + 0.12, Y + 0.18, X - 0.12, Y + 0.1, X, Y - 0.05);
            ctx.stroke();
          }
          ctx.restore();
        }
      }, { anim: true });
      // A white feather on the floor outside.
      R.thing(102.8, 5.0, (ctx) => {
        const [X, Y] = P(102.8, 5.0, 0.02);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.2, 0.07, -0.4, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
        ctx.beginPath(); ctx.moveTo(X - 0.22, Y + 0.1); ctx.lineTo(X + 0.16, Y - 0.06); ctx.strokeStyle = C.grey; ctx.lineWidth = 0.02; ctx.stroke();
      });
      // The goose, nesting on the warm router.
      R.goose((t) => ({ x: 101.65, y: 4.32, z: 0.73, dir: 'l', pose: 'sit', hidden: closet.k() < 0.5 }),
        { kind: 'poke', inside: closet, bias: 0.5, hint: 'The server closet is running warm. Something likes it there.' });
    }
    // A desk fan, pointed at the closet, doing its best.
    R.thing(99.4, 5.3, (ctx, t) => {
      box(ctx, 99.2, 5.1, 0, 0.4, 0.4, 0.08, C.white, { flat: true, lw: 0.025 });
      box(ctx, 99.36, 5.26, 0.08, 0.08, 0.08, 0.55, C.white, { flat: true, lw: 0.02 });
      const [X, Y] = P(99.4, 5.3, 0.85);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.28, 0.32, 0, 0, Math.PI * 2); paint(ctx, alpha(C.white, 0.5), { lw: 0.03 });
      if (Q.detail) for (let i = 0; i < 3; i++) {
        const a = t * 18 + (i * Math.PI * 2) / 3;
        ctx.beginPath(); ctx.ellipse(X + Math.cos(a) * 0.12, Y + Math.sin(a) * 0.14, 0.12, 0.05, a, 0, Math.PI * 2);
        ctx.fillStyle = C.sky; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    }, { anim: true });
    // On the back wall's cap: a lava lamp (always on) and the hackathon
    // trophies.
    R.thing(96.9, 0.15, (ctx, t) => {
      const [X, Y] = P(96.9, 0.15, 1.15);
      ctx.beginPath(); ctx.moveTo(X - 0.1, Y); ctx.lineTo(X + 0.1, Y); ctx.lineTo(X + 0.06, Y - 0.12); ctx.lineTo(X - 0.06, Y - 0.12); ctx.closePath(); paint(ctx, C.ink, { lw: 0.02 });
      ctx.beginPath(); ctx.moveTo(X - 0.07, Y - 0.12); ctx.lineTo(X + 0.07, Y - 0.12); ctx.lineTo(X + 0.04, Y - 0.62); ctx.lineTo(X - 0.04, Y - 0.62); ctx.closePath(); paint(ctx, C.purple, { lw: 0.02 });
      for (let i = 0; i < 2; i++) { const ph = (t * 0.12 + i * 0.5) % 1, by = Y - 0.16 - Math.abs(Math.sin(ph * Math.PI)) * 0.38; ctx.beginPath(); ctx.ellipse(X + (i ? 0.01 : -0.01), by, 0.035, 0.05, 0, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(X - 0.04, Y - 0.62); ctx.lineTo(X + 0.04, Y - 0.62); ctx.lineTo(X + 0.025, Y - 0.7); ctx.lineTo(X - 0.025, Y - 0.7); ctx.closePath(); paint(ctx, C.ink, { lw: 0.02 });
    }, { anim: true, depth: 99.5 });
    R.thing(89.4, 0.15, (ctx) => {
      for (const [x, col, hh] of [[88.9, C.mustard, 0.35], [89.3, C.greyLight, 0.28], [89.7, C.mustard, 0.22]]) {
        box(ctx, x - 0.08, 0.08, 1.15, 0.16, 0.16, 0.06, C.ink, { flat: true, stroke: false });
        cylinder(ctx, x, 0.16, 1.21, 0.05, hh - 0.08, col);
        const [X, Y] = P(x, 0.16, 1.15 + hh); ctx.beginPath(); ctx.arc(X, Y, 0.09, 0, Math.PI); paint(ctx, col, { lw: 0.02 });
      }
      plant(ctx, 90.6, 0.15, 1.15, 0.6);
    }, { depth: 95 });

    // ---------- The deploy screen, and the sign over it ----------
    const dep = R.poke({ id: 'deploy', at: [99.3, 8.8, 2.0], r: 1.0, hold: 2, say: (t) => `Deploying. ${deploy(t)}%. Do not touch.` });
    {
      const [x0, x1] = SCREEN_X, y = SCREEN_Y, cx = (x0 + x1) / 2;
      R.thing(cx, y + 0.5, (ctx) => {
        for (const px of [x0 + 0.4, x1 - 0.5]) {
          box(ctx, px - 0.3, y - 0.2, 0, 0.72, 0.7, 0.08, C.ink, { flat: true, lw: 0.02 });
          box(ctx, px, y + 0.1, 0.08, 0.12, 0.12, 3.67, shade(C.grey, 0.3), { flat: true, lw: 0.025 });
        }
        box(ctx, x0, y, 1.0, x1 - x0, 0.3, 2.0, C.black, { flat: true, lw: 0.04 });
        // NO DEPLOYS ON FRIDAYS, right over it.
        box(ctx, x0 + 0.1, y + 0.05, 3.12, x1 - x0 - 0.2, 0.12, 0.58, C.red, { flat: true, lw: 0.035 });
        plane(ctx, 'x', cx, y + 0.18, 3.41, (g) => txt(g, 'NO DEPLOYS ON FRIDAYS', 0, 0, 0.3, C.white, 'center', 'Rethink Sans', 800));
        // Someone's sticky on the sign.
        plane(ctx, 'x', x1 - 0.35, y + 0.19, 3.08, (g) => {
          g.save(); g.rotate(0.12); prect(g, -0.28, -0.2, 0.56, 0.4, INK.sticky);
          txt(g, 'JUST THIS', 0, -0.07, 0.09, C.ink); txt(g, 'ONCE', 0, 0.07, 0.09, C.ink); g.restore();
        });
      });
      R.thing(cx, y + 0.51, (ctx, t) => {
        const word = deployWord(t), touched = dep.k() > 0.5;
        // Rolling back drains the bar, in red.
        const p = word === 'ROLLING BACK' ? Math.max(0, Math.round(99 * (1 - (H(t) - 16.92) / 0.2))) : deploy(t);
        plane(ctx, 'x', cx, y + 0.305, 2.0, (g) => {
          prect(g, -2.25, -0.88, 4.5, 1.76, C.ink, { stroke: false });
          if (touched) {
            txt(g, 'DO NOT TOUCH', 0, -0.1, 0.5, C.red, 'center', 'Rethink Sans', 800);
            txt(g, 'This means you.', 0, 0.4, 0.2, C.white);
            return;
          }
          const back = word === 'ROLLING BACK';
          txt(g, word, -2.0, -0.5, 0.3, back && Math.floor(t * 3) % 2 ? C.red : C.white, 'left', 'Rethink Sans', 800);
          txt(g, `${p}%`, 2.0, -0.45, 0.55, INK.sticky, 'right', 'Rethink Sans', 800);
          // The bar.
          prect(g, -2.0, -0.08, 4.0, 0.36, C.black, { stroke: C.white, lw: 0.035 });
          const blinkOn = p < 99 || Math.floor(t * 2) % 2 === 0;
          if (p > 0 && blinkOn) prect(g, -1.96, -0.04, 3.92 * (p / 100), 0.28, back ? C.red : INK.sticky, { stroke: false });
          // The log, scrolling.
          if (Q.detail) {
            const n = Math.floor(t * 2);
            for (let i = 0; i < 3; i++) {
              const w = 0.6 + ((n + i) * 37 % 100) / 50;
              prect(g, -2.0, 0.42 + i * 0.13, w, 0.06, i === 2 ? C.tealLight : C.grey, { stroke: false });
            }
            txt(g, 'ETA: 2 MIN', 2.0, 0.6, 0.15, C.tealLight, 'right');
          }
        });
      }, { anim: true });
      // A light on top that turns while it deploys, and the screen's glow
      // after dark.
      R.light({
        at: [x0 + 0.46, y + 0.16, 3.95], r: 1.3, color: C.mustard, k: (t) => 0.2 + 0.45 * Math.max(0, Math.sin(t * 6)),
        draw: (ctx, t) => {
          const [X, Y] = P(x0 + 0.46, y + 0.16, 3.75);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.16, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.02 });
          ctx.beginPath(); ctx.arc(X, Y - 0.04, 0.13, Math.PI, 0); paint(ctx, Math.sin(t * 6) > 0 ? C.mustard : shade(C.mustard, 0.3), { lw: 0.025 });
        },
      });
      R.light({ at: [cx, y + 1.2, 1.4], r: 3.2, color: C.tealLight, k: (t) => nightK(t) * 0.5 });
    }

    // ---------- The duck desk: a dev explains his code to the duck ----------
    {
      const [x0, y0, w, d] = DUCK_DESK;
      R.thing(x0 + w / 2, y0 + d, (ctx) => {
        // Under it, asleep since last night's deploy, head out the front.
        box(ctx, 92.25, 14.85, 0, 0.7, 1.75, 0.26, C.teal, { flat: true, lw: 0.03, top: tint(C.teal, 0.12) });
        box(ctx, 92.28, 16.5, 0, 0.64, 0.45, 0.14, C.white, { flat: true, lw: 0.025 });
        const [HX, HY] = P(92.62, 16.62, 0.36);
        ctx.beginPath(); ctx.arc(HX, HY, 0.22, 0, Math.PI * 2); paint(ctx, mix(C.woodLight, C.brown, 0.4), { lw: 0.03 });
        ctx.beginPath(); ctx.arc(HX, HY - 0.03, 0.23, Math.PI * 1.0, Math.PI * 2.0); paint(ctx, C.purple, { lw: 0.025 });
        ctx.beginPath(); ctx.arc(HX, HY - 0.27, 0.06, 0, Math.PI * 2); paint(ctx, C.coral, { lw: 0.02 });
        if (Q.detail) {
          // Shut eyes, and a hand out on the pillow.
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025;
          ctx.beginPath(); ctx.arc(HX - 0.08, HY + 0.03, 0.045, 0.2, Math.PI - 0.2); ctx.moveTo(HX + 0.12, HY + 0.03); ctx.arc(HX + 0.08, HY + 0.03, 0.045, 0.2, Math.PI - 0.2); ctx.stroke();
          ctx.beginPath(); ctx.arc(...P(92.95, 16.75, 0.18), 0.07, 0, Math.PI * 2); paint(ctx, mix(C.woodLight, C.brown, 0.4), { lw: 0.02 });
        }
        // The desk.
        drawDesk(ctx, x0, y0, w, d);
        // A laptop (his), its lid toward us with a bear sticker on it.
        box(ctx, 90.85, 14.85, 1.1, 0.6, 0.38, 0.03, C.grey, { flat: true, lw: 0.02 });
        box(ctx, 90.85, 14.8, 1.13, 0.6, 0.04, 0.4, tint(C.grey, 0.2), { flat: true, lw: 0.025 });
        if (Q.detail) { const [X, Y] = P(91.15, 14.85, 1.33); ctx.beginPath(); ctx.ellipse(X, Y, 0.09, 0.06, 0, 0, Math.PI * 2); ctx.fillStyle = C.black; ctx.fill(); }
        // The duck: bright yellow, a good listener.
        {
          const [X0, Y0] = P(92.2, 15.75, 1.1);
          ctx.save(); ctx.translate(X0, Y0); ctx.scale(1.25, 1.25);
          const X = 0, Y = 0;
          ctx.beginPath(); ctx.ellipse(X, Y - 0.12, 0.25, 0.14, 0, 0, Math.PI * 2); ctx.moveTo(X + 0.2, Y - 0.2); ctx.lineTo(X + 0.33, Y - 0.3); ctx.lineTo(X + 0.24, Y - 0.1);
          paint(ctx, C.mustard, { lw: 0.025 });
          ctx.beginPath(); ctx.arc(X - 0.1, Y - 0.32, 0.13, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 });
          ctx.beginPath(); ctx.moveTo(X - 0.21, Y - 0.34); ctx.lineTo(X - 0.36, Y - 0.29); ctx.lineTo(X - 0.21, Y - 0.25); ctx.closePath(); paint(ctx, C.coral, { lw: 0.02 });
          ctx.beginPath(); ctx.arc(X - 0.14, Y - 0.35, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
          ctx.restore();
        }
        mug(ctx, 92.3, 14.95, 1.1, C.coral);
        papers(ctx, 92.9, 15.7, 1.1);
        // Keyboard and mouse.
        box(ctx, 93.0, 14.8, 1.1, 0.8, 0.28, 0.04, C.ink, { flat: true, lw: 0.02 });
        box(ctx, 94.05, 15.0, 1.1, 0.12, 0.18, 0.04, C.ink, { flat: true, lw: 0.02 });
      });
      // The pyramid of energy drinks, a row higher every few hours.
      const rows = (t) => { const h = H(t); return h < 8 ? 3 : 3 + Math.min(3, Math.floor((h - 8) / 4)); };
      const CAN = { x: 93.75, y: 15.5, r: 0.085, h: 0.18 };
      R.thing(CAN.x, 16.22, (ctx, t) => {
        const n = rows(t);
        for (let r = 0; r < n; r++) {
          const m = n - r;
          for (let i = 0; i < m; i++) {
            const k = (i - (m - 1) / 2) * 0.125;
            cylinder(ctx, CAN.x + k, CAN.y - k, 1.1 + r * 0.195, CAN.r, CAN.h, C.leaf, { top: C.greyLight, flat: true });
          }
        }
      }, { anim: true, depth: CAN.x + 16.22 });
      R.find({ id: 'duck', label: 'A rubber duck', at: [92.2, 15.75, 1.35], r: 0.6, hint: 'Someone in Dev is explaining their code to a very good listener.' });
      R.find({ id: 'energy', label: 'A pyramid of energy drinks', at: (t) => [CAN.x, CAN.y, 1.1 + rows(t) * 0.1], r: 0.8, hint: 'Dev runs on something green and fizzy, and they keep the empties.' });
      // Zzz, drifting out from under the desk.
      R.thing(92.8, 16.9, (ctx, t) => {
        if (!Q.detail) return;
        for (let i = 0; i < 2; i++) {
          const k = (t * 0.35 + i * 0.5) % 1;
          label(ctx, 92.75 + k * 0.5, 16.75 + k * 0.3, 0.75 + k * 1.1, 'z', 0.3 + k * 0.25, alpha(C.ink, 1 - k));
        }
      }, { anim: true, depth: 109.6 });
      // The dev at the duck: talks it through all day, mid-sentence when the
      // bear comes, so he never goes to the window. Pizza after eight.
      const look = devLook(597, 9, { style: 'curly', hair: HAIR[6] });
      const LINES = ['So THEN it calls itself.', 'Which is fine. Right?', 'Oh. Oh no. Thanks, duck.'];
      const slice = (ctx) => { ctx.beginPath(); ctx.moveTo(-0.05, -0.1); ctx.lineTo(0.3, -0.02); ctx.lineTo(-0.02, 0.14); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.025 }); ctx.beginPath(); ctx.arc(0.06, 0.0, 0.03, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill(); };
      R.mover(() => ({ x: 91.0, y: 14.25 }), (ctx, t, p) => {
        if (!dev(t)) return;
        const pizza = H(t) >= 20.15;
        const pose = pizza ? 'carry' : ['point', 'wave', 'read', 'point', 'stand'][Math.floor(t / 1.7) % 5];
        person(ctx, p.x, p.y, 0, { ...look, pose, dir: 'l', speed: 5, hold: pizza ? slice : null }, t);
        if (Q.detail && !pizza && t % 17 < 2.8) speech(ctx, p.x, p.y, 2.75, LINES[Math.floor(t / 17) % LINES.length], { size: 0.42 });
      });
    }

    // ---------- The shelf, with a plush goose from an old client ----------
    {
      const [x0, y0, w, d, h] = SHELF;
      R.thing(x0 + w / 2, y0 + d, (ctx) => {
        box(ctx, x0, y0, 0, w, d, h, C.white, { flat: true, lw: 0.035 });
        const fy = y0 + d + 0.005;
        for (const z0 of [0.1, 0.55]) face(ctx, [[x0 + 0.08, fy, z0], [x0 + w - 0.08, fy, z0], [x0 + w - 0.08, fy, z0 + 0.36], [x0 + 0.08, fy, z0 + 0.36]], shade(C.greyLight, 0.35), { lw: 0.02 });
        // Books on the top shelf (the ones with animals on them), a box of
        // cables on the bottom one.
        const cols = [C.teal, C.coral, C.navy, C.mustard, C.green, C.purple, C.red];
        for (let i = 0; i < 7; i++) {
          const bx = x0 + 0.12 + i * 0.13, hh = 0.26 + ((i * 5) % 3) * 0.03;
          face(ctx, [[bx, fy + 0.01, 0.56], [bx + 0.11, fy + 0.01, 0.56], [bx + 0.11, fy + 0.01, 0.56 + hh], [bx, fy + 0.01, 0.56 + hh]], cols[i], { lw: 0.015 });
        }
        face(ctx, [[x0 + 0.15, fy + 0.01, 0.11], [x0 + 0.85, fy + 0.01, 0.11], [x0 + 0.85, fy + 0.01, 0.4], [x0 + 0.15, fy + 0.01, 0.4]], C.woodLight, { lw: 0.02 });
        plane(ctx, 'x', x0 + 0.5, fy + 0.015, 0.26, (g) => txt(g, 'CABLES?', 0, 0, 0.1, C.brown));
        face(ctx, [[x0 + 0.95, fy + 0.01, 0.11], [x0 + 1.35, fy + 0.01, 0.11], [x0 + 1.35, fy + 0.01, 0.22], [x0 + 0.95, fy + 0.01, 0.22]], C.ink, { lw: 0.015 });
        // On top: the plush goose, with its ribbon, and a little cactus.
        drawGoose(ctx, 97.45, 15.3, h, 0, { pose: 'sit', dir: 'l', scale: 0.72 });
        const [X, Y] = P(97.45, 15.3, h);
        ctx.beginPath(); ctx.ellipse(X - 0.2, Y - 0.32, 0.06, 0.04, 0.6, 0, Math.PI * 2); ctx.ellipse(X - 0.1, Y - 0.32, 0.06, 0.04, -0.6, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.015 });
        box(ctx, 97.05, 15.25, h, 0.1, 0.06, 0.03, C.white, { flat: true, lw: 0.012 });
        plant(ctx, 98.0, 15.3, h, 0.45, C.leaf);
      });
      R.decoy({ id: 'plush', at: [97.45, 15.3, 1.35], r: 0.6, say: 'Plush. From a client who left us.' });
    }

    // ---------- Odds and ends ----------
    // Dev's own fridge against the back wall: nothing in it but energy
    // drinks.
    R.thing(95.45, 1.25, (ctx) => {
      box(ctx, 94.95, 0.4, 0, 1.0, 0.85, 1.05, C.white, { flat: true, lw: 0.03 });
      const fy = 1.255;
      face(ctx, [[95.03, fy, 0.08], [95.87, fy, 0.08], [95.87, fy, 0.97], [95.03, fy, 0.97]], tint(C.sky, 0.35), { lw: 0.025 });
      for (const z0 of [0.18, 0.5]) for (let i = 0; i < 5; i++) face(ctx, [[95.1 + i * 0.15, fy + 0.005, z0], [95.2 + i * 0.15, fy + 0.005, z0], [95.2 + i * 0.15, fy + 0.005, z0 + 0.22], [95.1 + i * 0.15, fy + 0.005, z0 + 0.22]], C.leaf, { lw: 0.012 });
      plane(ctx, 'x', 95.45, fy + 0.01, 0.88, (g) => txt(g, 'DEV ONLY', 0, 0, 0.09, C.red));
    });
    // A beanbag, with somebody's hoodie on it.
    R.thing(89.1, 4.9, (ctx) => {
      const [X, Y] = P(89.0, 4.6, 0);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.3, 0.62, 0.38, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { dots: shade(C.mustard, 0.4), density: 0.18 });
      ctx.beginPath(); ctx.ellipse(X - 0.05, Y - 0.5, 0.36, 0.16, 0.1, 0, Math.PI * 2); paint(ctx, C.purple, { lw: 0.025 });
      ctx.beginPath(); ctx.ellipse(X + 0.25, Y - 0.38, 0.1, 0.18, 0.6, 0, Math.PI * 2); paint(ctx, C.purple, { lw: 0.02 });
    });
    // The robot vacuum, doing laps of the empty bit of floor (BUG #399:
    // "it is afraid of the shelf").
    R.mover((t) => {
      const pts = [[99.6, 13.0], [103.1, 13.0], [103.1, 17.6], [99.6, 17.6], [99.6, 13.0]];
      const L = pathLen(pts), k = ((t * 0.55) % L) / L;
      const [x, y] = along(pts, k);
      return { x, y };
    }, (ctx, t, p) => {
      cylinder(ctx, p.x, p.y, 0, 0.3, 0.12, C.ink, { top: shade(C.grey, 0.3), flat: true });
      const [X, Y] = P(p.x, p.y, 0.12);
      ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fillStyle = Math.sin(t * 4) > 0 ? C.leaf : C.green; ctx.fill();
      if (Q.detail) { ctx.save(); ctx.translate(X - 0.2, Y + 0.05); ctx.scale(1, 0.55); ctx.fillStyle = INK.sticky; ctx.fillRect(0, -0.14, 0.2, 0.2); ctx.restore(); }
    });

    // ---------- The snack table, and pizza after eight ----------
    {
      const [x0, y0, w, d, h] = TABLE;
      R.thing(x0 + w / 2, y0 + d, (ctx) => {
        for (const [lx, ly] of [[x0 + 0.08, y0 + 0.08], [x0 + w - 0.16, y0 + 0.08], [x0 + 0.08, y0 + d - 0.16], [x0 + w - 0.16, y0 + d - 0.16]]) box(ctx, lx, ly, 0, 0.08, 0.08, h - 0.05, C.ink, { flat: true, stroke: false });
        box(ctx, x0, y0, h - 0.05, w, d, 0.05, C.wood, { flat: true, lw: 0.03 });
        // The coffee, and a bowl of fruit nobody's touched.
        cylinder(ctx, x0 + w - 0.3, y0 + 0.35, h, 0.12, 0.38, C.ink);
        const [X, Y] = P(x0 + w - 0.35, y0 + d - 0.3, h);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.04, 0.2, 0.09, 0, 0, Math.PI); paint(ctx, C.white, { lw: 0.02 });
        for (const [dx, col] of [[-0.08, C.red], [0.06, C.leaf], [0, C.mustard]]) { ctx.beginPath(); ctx.arc(X + dx, Y - 0.1 - (col === C.mustard ? 0.06 : 0), 0.07, 0, Math.PI * 2); paint(ctx, col, { lw: 0.015 }); }
      });
      const pbox = (ctx, x, y, z, open, slices) => {
        box(ctx, x, y, z, 0.8, 0.8, 0.1, C.white, { flat: true, lw: 0.025 });
        if (!open) { plane(ctx, 'x', x + 0.4, y + 0.81, z + 0.05, (g) => txt(g, 'PIZZA', 0, 0, 0.07, C.red)); return; }
        // The lid up at the back, and what's left.
        face(ctx, [[x, y, z + 0.1], [x + 0.8, y, z + 0.1], [x + 0.8, y - 0.05, z + 0.85], [x, y - 0.05, z + 0.85]], tint(C.white, 0.1), { lw: 0.025 });
        if (slices > 0) {
          const [X, Y] = P(x + 0.4, y + 0.4, z + 0.11);
          ctx.beginPath(); ctx.moveTo(X, Y); ctx.ellipse(X, Y, 0.48, 0.24, 0, 0, (slices / 8) * Math.PI * 2); ctx.closePath();
          paint(ctx, C.mustard, { lw: 0.025 });
          if (Q.detail) for (let i = 0; i < slices; i++) { const a = ((i + 0.5) / 8) * Math.PI * 2; ctx.beginPath(); ctx.arc(X + Math.cos(a) * 0.28, Y + Math.sin(a) * 0.14, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill(); }
        }
      };
      R.thing(x0 + w / 2, y0 + d + 0.02, (ctx, t) => {
        const h2 = H(t), s = wrap(t);
        if (h2 < 20) return;
        if (s < 266) { for (let i = 0; i < 3; i++) pbox(ctx, x0 + 0.5, y0 + 0.1, h + i * 0.11, false); return; }
        const slices = Math.max(1, 8 - Math.floor((s - 266) / 4));
        pbox(ctx, x0 + 0.08, y0 + 0.1, h, true, slices);
        if (s < 300) pbox(ctx, x0 + 0.92, y0 + 0.1, h, false);
      }, { anim: true });
      // The empties, on the floor, after.
      R.thing(100.65, 12.3, (ctx, t) => {
        const s = wrap(t);
        if (H(t) < 20 || s < 300) return;
        for (let i = 0; i < 3; i++) box(ctx, 100.25 + i * 0.04, 11.45 - i * 0.03, i * 0.11, 0.8, 0.8, 0.1, C.white, { flat: true, lw: 0.025 });
        ticket(ctx, 'x', 100.7, 12.27, 0.18, '404', C.pink);
      }, { anim: true });
    }

    // ---------- QA's corner ----------
    // The bug board: a corkboard, with a blind over the NEW column. Open it
    // and BUG #412 is there: the bear.
    const board = R.poke({ id: 'bugs', at: [102.0, 21.0, 1.6], r: 0.9, say: 'BUG #411: coffee. #412: see below.' });
    {
      const { x, y0, y1 } = BOARD, cy = (y0 + y1) / 2, fx = x + 0.41;
      R.thing(x + 0.2, y1, (ctx) => {
        for (const y of [y0 + 0.3, y1 - 0.4]) {
          box(ctx, x + 0.12, y - 0.25, 0, 0.16, 0.6, 0.05, C.ink, { flat: true, stroke: false });
          box(ctx, x + 0.15, y, 0.05, 0.1, 0.1, 0.85, C.ink, { flat: true, stroke: false });
        }
        box(ctx, x, y0, 0.85, 0.4, y1 - y0, 1.6, C.wood, { flat: true, lw: 0.035 });
        plane(ctx, 'y', fx, cy, 1.65, (g) => {
          prect(g, -1.9, -0.7, 3.8, 1.4, C.woodLight, { lw: 0.025, dots: shade(C.woodLight, 0.3), density: 0.25 });
          txt(g, 'BUGS', -1.85, -0.55, 0.16, C.red, 'left', 'Rethink Sans', 800);
          txt(g, '411 AND COUNTING', 1.85, -0.55, 0.11, C.ink, 'right');
          txt(g, 'NEW', -0.6, -0.33, 0.1, C.ink);
          txt(g, 'WONTFIX', 0.55, -0.33, 0.1, C.ink);
          txt(g, 'FIXED', 1.45, -0.33, 0.1, C.ink);
          // The other columns: tickets everywhere, and one fixed.
          const cols = [C.pink, INK.sticky, C.mint, INK.sticky, C.pink];
          for (let i = 0; i < 9; i++) {
            const u = 0.2 + (i % 3) * 0.3, v = -0.12 + Math.floor(i / 3) * 0.28;
            g.save(); g.translate(u, v); g.rotate(((i * 7) % 5 - 2) * 0.05); prect(g, -0.12, -0.11, 0.24, 0.22, cols[i % 5], { lw: 0.015 }); g.restore();
          }
          prect(g, 1.33, -0.12, 0.24, 0.22, C.mint, { lw: 0.015 });
          // The far left: the old ones, curling.
          for (let i = 0; i < 6; i++) { const u = -1.65 + (i % 2) * 0.32, v = -0.3 + Math.floor(i / 2) * 0.3; prect(g, u, v, 0.26, 0.22, cols[(i + 2) % 5], { lw: 0.015 }); }
        });
      });
      // The blind over NEW, and under it, BUG #412.
      R.thing(x + 0.2, y1 + 0.01, (ctx) => {
        const k = board.k();
        plane(ctx, 'y', fx + 0.01, cy, 1.65, (g) => {
          const u0 = -1.05, u1 = -0.15, top = -0.22, bottom = 0.65;
          if (k > 0.05) {
            // The card: a bear, in the lot, severity high.
            prect(g, u0 + 0.02, top + 0.05, u1 - u0 - 0.04, bottom - top - 0.1, C.white, { lw: 0.02 });
            txt(g, 'BUG #412', u0 + 0.08, top + 0.15, 0.12, C.red, 'left', 'Rethink Sans', 800);
            txt(g, 'BEAR IN LOT', u0 + 0.08, top + 0.32, 0.1, C.ink, 'left');
            txt(g, 'SEVERITY: HIGH', u0 + 0.08, top + 0.48, 0.08, C.red, 'left');
            g.beginPath(); g.ellipse(u1 - 0.2, top + 0.62, 0.12, 0.07, 0, 0, Math.PI * 2); g.moveTo(u1 - 0.04, top + 0.56); g.arc(u1 - 0.08, top + 0.56, 0.05, 0, Math.PI * 2);
            g.fillStyle = C.black; g.fill();
          }
          // The blind rolls up into its tube.
          const hh = (bottom - top) * (1 - k);
          if (hh > 0.01) {
            prect(g, u0, top, u1 - u0, hh, C.white, { lw: 0.02 });
            if (hh > 0.5) { txt(g, 'QA ONLY', (u0 + u1) / 2, top + 0.25, 0.12, C.ink); txt(g, 'NO PEEKING', (u0 + u1) / 2, top + 0.42, 0.09, C.ink); }
          }
          prect(g, u0 - 0.04, top - 0.08, u1 - u0 + 0.08, 0.09, C.grey, { lw: 0.02 });
          // A red corner of something new, peeking out underneath.
          if (k < 0.5) { g.beginPath(); g.moveTo(u1 - 0.3, bottom); g.lineTo(u1 - 0.08, bottom); g.lineTo(u1 - 0.08, bottom + 0.12); g.closePath(); paint(g, C.red, { lw: 0.015 }); }
        });
      }, { anim: true });
      R.find({ id: 'bear-bug', label: 'A bug report about a bear', kind: 'poke', inside: board, at: [fx + 0.01, cy + 0.6, 1.4], r: 0.6, hint: 'QA has filed something about the visitor in the lot. It\'s on their board.' });
    }
    // The box of things Priya has tested.
    R.thing(100.9, 23.7, (ctx) => {
      // What's sticking out: a keyboard, a chair wheel, a gooseneck lamp.
      box(ctx, 100.65, 23.05, 0.3, 0.12, 0.5, 0.5, C.ink, { flat: true, lw: 0.02 });
      const [LX, LY] = P(101.05, 23.2, 0.55);
      ctx.beginPath(); ctx.moveTo(LX, LY); ctx.quadraticCurveTo(LX + 0.1, LY - 0.5, LX + 0.35, LY - 0.45); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.arc(LX + 0.38, LY - 0.4, 0.09, Math.PI * 1.1, Math.PI * 0.1); paint(ctx, C.coral, { lw: 0.02 });
      box(ctx, 100.5, 22.9, 0, 0.8, 0.8, 0.55, C.woodLight, { lw: 0.03, dotsL: shade(C.woodLight, 0.4) });
      face(ctx, [[100.5, 23.7, 0.55], [101.3, 23.7, 0.55], [101.3, 23.98, 0.75], [100.5, 23.98, 0.75]], C.woodLight, { lw: 0.025 });
      const [WX, WY] = P(100.75, 23.5, 0.6); ctx.beginPath(); ctx.arc(WX, WY, 0.09, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.015 });
      plane(ctx, 'x', 100.9, 23.71, 0.3, (g) => txt(g, 'TESTED', 0, 0, 0.13, C.brown, 'center', 'Rethink Sans', 800));
    });
    // Priya's chair: she stands on it to test the ceiling, and it wobbles
    // (BUG #303).
    const priHere = (t) => seated(t, 0.25);
    const priR = (t) => rushK(t, 2.4, 0.4);
    const tile = (ctx, x, y, z) => box(ctx, x - 0.4, y - 0.4, z, 0.8, 0.8, 0.05, tint(C.greyLight, 0.45), { flat: true, lw: 0.025, dotsT: C.grey, densT: 0.3 });
    R.thing(PRI[0], PRI[1], (ctx, t) => {
      const on = priHere(t) && priR(t) <= 0;
      const w = on ? Math.sin(t * 7) * 0.035 : 0;
      drawChair(ctx, PRI[0] + w, PRI[1], 0, CHAIR, -1, 'all');
      if (!on) tile(ctx, PRI[0], PRI[1], 0.62);
      if (H(t) >= 9) ticket(ctx, 'x', PRI[0] + w, PRI[1] + 0.33, 0.5, '303');
    }, { anim: true });
    {
      const look = folk(585, { top: C.mustard, bottom: C.ink, style: 'bun', dress: false,
        wear: (ctx, b) => { if (b.back || !Q.detail) return; ctx.strokeStyle = C.red; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(-0.08, b.top + 0.05); ctx.lineTo(0.06, b.top + 0.4); ctx.lineTo(0.18, b.top + 0.05); ctx.stroke(); ctx.fillStyle = C.white; ctx.fillRect(0.0, b.top + 0.38, 0.13, 0.16); } });
      const clip = (ctx) => { ctx.beginPath(); ctx.rect(-0.05, -0.25, 0.28, 0.36); paint(ctx, C.wood, { lw: 0.025 }); ctx.fillStyle = C.white; ctx.fillRect(-0.01, -0.2, 0.2, 0.27); };
      R.mover((t) => {
        if (!priHere(t)) return { x: PRI[0], y: PRI[1], gone: true };
        const r = priR(t);
        if (r <= 0) return { x: PRI[0] + Math.sin(t * 7) * 0.035, y: PRI[1], z: 0.62, on: true };
        return { x: PRI[0] + (PRI_GLASS[0] - PRI[0]) * r, y: PRI[1] + (PRI_GLASS[1] - PRI[1]) * r, z: 0, moving: r < 1 };
      }, (ctx, t, p) => {
        if (p.gone) return;
        if (p.on) {
          // Pushing a ceiling tile up, to see if it holds.
          person(ctx, p.x, p.y, p.z, { ...look, pose: 'stand', dir: 'r', arms: [Math.PI - 0.22, -Math.PI + 0.22] }, t);
          tile(ctx, p.x + Math.sin(t * 3) * 0.05, p.y, p.z + 2.0 + Math.max(0, Math.sin(t * 1.6)) * 0.12);
          if (Q.detail && (t + 5) % 23 < 2.4) speech(ctx, p.x, p.y, p.z + 2.9, 'Filed.', { size: 0.42 });
          return;
        }
        person(ctx, p.x, p.y, 0, { ...look, pose: p.moving ? 'run' : 'read', dir: 'l', hold: p.moving ? null : clip }, t);
        if (Q.detail && !p.moving && t % 9 < 2.6) speech(ctx, p.x, p.y, 2.6, 'Severity: HIGH.', { size: 0.42, dx: 1.3 });
      }, { bias: 0.08 });
    }

    // ---------- The front pods ----------
    // Hoodies, headphones, and at bear o'clock the cat video.
    const front = [...pod(R, 91.6, 'front', 3), ...pod(R, 96.4, 'front', 2)];
    const KINDS = ['code', 'code', 'code', 'terminal', 'code', 'email', 'code', (t) => (bearOClock(t) ? 'cat' : 'terminal'), 'terminal', 'code'];
    staff(R, front, 590, {
      empty: [2],
      kinds: KINDS,
      look: (i) => ({ dress: false, top: HOOD[(i + 4) % HOOD.length], wear: hoodie(HOOD[(i + 4) % HOOD.length]), ...(i % 3 === 0 ? { face: headphones(C.coral) } : {}) }),
      each: () => ({ always: dev }),
    });
    // Hoodies on the backs of chairs: the empty desk's, and a few others.
    chairHoodie(R, front[2], C.green);
    chairHoodie(R, front[7], C.grey);
    chairHoodie(R, front[9], C.navy);
    chairHoodie(R, front[4], C.purple);
    const cat = front[7];
    R.find({ id: 'cat-video', label: 'A cat video', kind: 'hard', at: [cat.mon[0] + 0.06, cat.mon[1], cat.mon[2] + 0.6], r: 0.6, when: bearOClock, note: 'bear o\'clock',
      riddle: 'Left playing while its owner watches the lot.', hint: 'At bear o\'clock one of Dev\'s screens stops pretending to be code.' });

    // ---------- QA's tickets, turning up on things all day ----------
    for (const [h0, al, x, y, z, num, depth, at] of TICKETS) {
      R.thing(at[0], at[1], (ctx, t) => { if (H(t) >= h0) ticket(ctx, al, x, y, z, num); }, { anim: true, depth: depth + 0.03 });
    }
  },
};
