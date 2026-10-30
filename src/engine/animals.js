// The animal kit (ROADMAP E6, first slice): farm animals drawn the way
// person() draws people, in profile, in the game's print, at people scale
// (a person is about 2.3 units tall). One call draws one animal; it's a pure
// function of t, so anything that moves is drawn anim, and anyone on a map's
// clock (schedule() in actors.js) can be an animal: a walker whose draw()
// calls animal() with the pose schedule() gives it ('walk', 'run', 'stand').
//
//   animal(ctx, x, y, z, { kind, pose, dir, back, scale, color, wool, phase }, t)
//
// kind:  donkey | sheep | goat | pig | dog | cat | hen
// pose:  stand | walk | run | graze (head down) | lie | sit (a dog or a cat)
//        | peck (a hen; graze is the same thing)
// dir:   'r' or 'l', the way it faces on the screen (as person())
// wool:  a sheep's fleece: 1 woolly (the default), 0.5 half sheared (the
//        front half woolly, the back bald), 0 sheared
// color: its coat (each kind has a default); for a hen, white or the default
//        red-brown; for a cat, its fur
// phase: where it is in its walk, so a flock doesn't step in time
//
// Speed: each animal is a handful of shapes (about ten), no halftone. On the
// 2017 laptop the cost of a place is the number of shapes Chrome replays, and
// animals count against the same budget as people (docs/levels/farm.md).
//
// For tools: watch.person(ctx, x, y, r) is called with each animal's body, as
// it is with each person's head, so QA's covered check counts animals too.

import { C, Q, paint, alpha, shade, watch } from './art.js';
import { ZK } from './iso.js';

// The kit's own inks: coats, mixed from the game's (a place can pass its own).
export const COAT = {
  donkey: '#8D8278',
  sheep: '#EFE6D2',
  shorn: '#E9CDB8',
  goat: '#F2EDE2',
  pig: '#EDB0A0',
  dog: '#A0683F',
  cat: '#D98B3A',
  hen: '#A9533A',
};

// Each kind's size and build, in units: len (nose to tail, the body), body
// (how deep), leg (from the belly down), head (radius), neck (the head's
// lift above the shoulder and its reach past it). top: how tall it stands,
// for a tag over it or a tap's radius.
export const BUILD = {
  donkey: { len: 1.6, body: 0.66, leg: 0.68, head: 0.24, neck: [0.3, 0.45], top: 1.85 },
  sheep: { len: 1.05, body: 0.56, leg: 0.36, head: 0.16, neck: [0.17, 0.2], top: 1.1 },
  goat: { len: 0.95, body: 0.44, leg: 0.42, head: 0.15, neck: [0.18, 0.38], top: 1.25 },
  pig: { len: 1.75, body: 0.75, leg: 0.32, head: 0.24, neck: [0.18, 0.05], top: 1.2 },
  dog: { len: 0.95, body: 0.38, leg: 0.4, head: 0.17, neck: [0.15, 0.32], top: 1.05 },
  cat: { len: 0.62, body: 0.24, leg: 0.24, head: 0.13, neck: [0.06, 0.18], top: 0.65 },
  hen: { len: 0.5, body: 0.36, leg: 0.2, head: 0.1, neck: [0.06, 0.24], top: 0.8 },
};

export function animal(ctx, x, y, z, o = {}, t = 0) {
  const kind = o.kind || 'sheep';
  const b = BUILD[kind];
  if (!b) throw new Error(`animal: no kind "${kind}" (the kit has ${Object.keys(BUILD).join(', ')})`);
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const f = o.dir === 'l' ? -1 : 1;
  const s = o.scale || 1;
  // (Only a dog or a cat sits; anything else sitting lies down.)
  const pose = o.pose === 'sit' && kind !== 'dog' && kind !== 'cat' && kind !== 'hen' ? 'lie' : o.pose || 'stand';
  const coat = o.color || COAT[kind];
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * s, s);
  // A shadow under it, as people have.
  if (Q.detail && pose !== 'lie') {
    ctx.beginPath();
    ctx.ellipse(0, 0, b.len * 0.5, b.len * 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.16);
    ctx.fill();
  }
  if (kind === 'hen') hen(ctx, b, pose, coat, o, t);
  else beast(ctx, kind, b, pose, coat, o, t);
  ctx.restore();
}

// A stroke with an ink edge: the ink line a little wider, then the color.
function inked(ctx, color, width) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = width + 0.1;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// Four legs, a body, a neck and a head. The body's middle is at (0, -mid);
// the front is toward +x.
function beast(ctx, kind, b, pose, coat, o, t) {
  const { len, body, leg } = b;
  const run = pose === 'run', walk = pose === 'walk' || run;
  const lie = pose === 'lie', sit = pose === 'sit';
  const graze = pose === 'graze' || pose === 'peck';
  const ph = (o.phase || 0) + t * (run ? 11 : 6.5);
  const swing = walk ? Math.sin(ph) * (run ? 0.6 : 0.34) : 0;
  const bounce = run ? Math.abs(Math.cos(ph)) * 0.08 : walk ? Math.abs(Math.cos(ph)) * 0.025 : 0;
  // How high the belly is: on its legs, on the ground lying down.
  const belly = lie ? 0.04 : leg + bounce;
  const mid = belly + body / 2;
  const fx = len * 0.32, bx = -len * 0.32; // front and back legs, along it
  const legC = kind === 'sheep' ? C.ink : kind === 'pig' ? coat : shade(coat, 0.12);
  const wool = kind === 'sheep' ? (o.wool ?? 1) : 0;
  const tilt = sit ? -0.42 : 0;

  // Legs: the far pair first, a shade darker; the diagonal pairs swing together.
  const legs = (near) => {
    if (lie) return;
    ctx.beginPath();
    const off = near ? 0.06 : -0.06;
    const a = near ? swing : -swing;
    const w = Math.max(0.09, len * 0.075);
    // Back leg (folded under, sitting).
    if (sit) {
      ctx.moveTo(bx + off, -leg * 0.55);
      ctx.lineTo(bx + off + leg * 0.5, -0.05);
    } else {
      ctx.moveTo(bx + off, -belly - 0.05);
      ctx.lineTo(bx + off + Math.sin(-a) * leg, -belly - 0.05 + Math.cos(a) * (leg + 0.05));
    }
    ctx.moveTo(fx + off, -belly - 0.05 - (sit ? leg * 0.35 : 0));
    ctx.lineTo(fx + off + Math.sin(a) * leg, -(sit ? 0 : belly) + Math.cos(a) * (sit ? 0 : leg) - 0.0);
    inked(ctx, near ? legC : shade(legC, 0.25), w);
  };
  legs(false);

  ctx.save();
  ctx.translate(0, -mid);
  ctx.rotate(tilt);
  // The tail, behind the body.
  tail(ctx, kind, b, coat, ph, walk);
  // The body. A sheep's fleece is a scalloped cloud; sheared, a slim pale
  // body; half sheared, the front half cloud and the back half bare.
  if (kind === 'sheep' && wool > 0) {
    if (wool < 1) {
      ctx.beginPath();
      ctx.ellipse(-len * 0.18, 0.04, len * 0.36, body * 0.4, 0, 0, Math.PI * 2);
      paint(ctx, COAT.shorn);
    }
    fleece(ctx, wool < 1 ? len * 0.06 : 0, wool < 1 ? len * 0.36 : len * 0.52, body * 0.55, coat);
  } else {
    ctx.beginPath();
    const bw = len / 2, bh = body / 2 * (kind === 'sheep' ? 0.78 : 1);
    ctx.roundRect(-bw, -bh, len, bh * 2, Math.min(bh, bw) * (kind === 'pig' ? 1 : 0.85));
    paint(ctx, kind === 'sheep' ? COAT.shorn : coat);
    if (kind === 'goat' && Q.detail) {
      // A patch on its side.
      ctx.beginPath();
      ctx.ellipse(-len * 0.12, -body * 0.05, len * 0.16, body * 0.26, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = C.brown;
      ctx.fill();
    }
  }
  if (watch.person) watch.person(ctx, 0, 0, Math.min(len, body * 2) * 0.42);
  ctx.restore();

  legs(true);

  // Neck and head. Grazing, the head's down at the grass in front.
  const sh = [fx + len * 0.12, -mid - body * 0.2]; // the shoulder
  let hx = sh[0] + b.neck[0], hy = sh[1] - b.neck[1];
  if (graze) { hx = len / 2 + b.head * 0.8; hy = -b.head * 1.1; }
  if (lie) { hy = sh[1] - b.neck[1] * 0.8; }
  if (sit) { hx = sh[0] - 0.02; hy = -mid - body - b.neck[1] * 1.2; }
  if (kind !== 'pig') {
    ctx.beginPath();
    ctx.moveTo(sh[0] - len * 0.08, sh[1] + body * 0.15);
    ctx.lineTo(hx - b.head * 0.3, hy);
    inked(ctx, coat, b.head * (kind === 'donkey' ? 1.6 : 1.25));
  }
  head(ctx, kind, b, hx, hy, coat, graze, wool, o);
}

// A fleece: a cloud of bumps over [x0 - w, x0 + w], with an ink edge.
function fleece(ctx, x0, w, h, color) {
  ctx.beginPath();
  const n = Math.max(5, Math.round(w * 9));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const cx = x0 + Math.cos(a) * w * 0.82, cy = Math.sin(a) * h * 0.78;
    const r = (w + h) * 0.19;
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.moveTo(x0 + w * 0.85, 0);
  ctx.ellipse(x0, 0, w * 0.85, h * 0.82, 0, 0, Math.PI * 2);
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.12;
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.fill();
}

function tail(ctx, kind, b, coat, ph, walk) {
  const L = -b.len / 2;
  const wag = Math.sin(ph * 1.7) * (walk ? 0.12 : 0.05);
  ctx.beginPath();
  if (kind === 'donkey') {
    ctx.moveTo(L + 0.02, -b.body * 0.3);
    ctx.quadraticCurveTo(L - 0.12, 0, L - 0.08 + wag, b.body * 0.55);
    inked(ctx, shade(coat, 0.2), 0.07);
    ctx.beginPath();
    ctx.ellipse(L - 0.08 + wag, b.body * 0.62, 0.06, 0.12, 0, 0, Math.PI * 2);
    paint(ctx, C.ink, { stroke: false });
  } else if (kind === 'pig') {
    ctx.moveTo(L, -b.body * 0.15);
    ctx.arc(L - 0.08, -b.body * 0.2, 0.07, 0, Math.PI * 1.6);
    inked(ctx, coat, 0.04);
  } else if (kind === 'goat') {
    ctx.moveTo(L + 0.04, -b.body * 0.3);
    ctx.lineTo(L - 0.08, -b.body * 0.55 + wag);
    inked(ctx, coat, 0.08);
  } else if (kind === 'dog') {
    ctx.moveTo(L + 0.04, -b.body * 0.25);
    ctx.quadraticCurveTo(L - 0.2, -b.body * 0.5, L - 0.22 + wag, -b.body * 1.05);
    inked(ctx, coat, 0.08);
  } else if (kind === 'cat') {
    ctx.moveTo(L + 0.04, -b.body * 0.1);
    ctx.quadraticCurveTo(L - 0.28, 0, L - 0.2 + wag, -b.body * 1.6);
    inked(ctx, coat, 0.07);
  } else if (kind === 'sheep') {
    ctx.moveTo(L + 0.06, -b.body * 0.1);
    ctx.lineTo(L - 0.06, b.body * 0.18);
    inked(ctx, C.white, 0.1);
  }
}

function head(ctx, kind, b, hx, hy, coat, graze, wool, o) {
  const r = b.head;
  const face = kind === 'sheep' ? C.ink : coat;
  // Ears first, behind the head.
  ctx.beginPath();
  if (kind === 'donkey') {
    // Long, upright: the donkey's.
    ctx.ellipse(hx - r * 0.75, hy - r * 1.2, r * 0.26, r * 0.85, -0.45, 0, Math.PI * 2);
    ctx.moveTo(hx - r * 0.25 + r * 0.26, hy - r * 1.3);
    ctx.ellipse(hx - r * 0.25, hy - r * 1.3, r * 0.26, r * 0.85, -0.1, 0, Math.PI * 2);
    paint(ctx, shade(coat, 0.08));
  } else if (kind === 'cat') {
    ctx.moveTo(hx - r * 0.85, hy - r * 0.4);
    ctx.lineTo(hx - r * 0.6, hy - r * 1.5);
    ctx.lineTo(hx - r * 0.1, hy - r * 0.8);
    ctx.lineTo(hx + r * 0.25, hy - r * 1.5);
    ctx.lineTo(hx + r * 0.7, hy - r * 0.5);
    paint(ctx, coat);
  } else if (kind === 'goat') {
    // Horns, curving back.
    ctx.moveTo(hx - r * 0.2, hy - r * 0.8);
    ctx.quadraticCurveTo(hx - r * 0.6, hy - r * 2, hx - r * 1.4, hy - r * 1.4);
    inked(ctx, C.greyLight, 0.06);
    ctx.beginPath();
  }
  // The head: a long muzzle on a donkey, a goat, a sheep and a dog; a round
  // face on a cat; a snout on a pig.
  ctx.beginPath();
  const down = graze ? 0.9 : kind === 'donkey' ? 0.55 : 0.3; // the muzzle points down when grazing
  if (kind === 'cat') ctx.arc(hx, hy, r, 0, Math.PI * 2);
  else if (kind === 'pig') {
    ctx.ellipse(hx, hy, r * 1.15, r, 0, 0, Math.PI * 2);
  } else {
    const L = kind === 'donkey' ? r * 2.2 : kind === 'dog' ? r * 1.6 : r * 1.8;
    ctx.ellipse(hx + Math.cos(down) * L * 0.3, hy + Math.sin(down) * L * 0.3, L * 0.55, r, down, 0, Math.PI * 2);
  }
  paint(ctx, face);
  if (kind === 'pig') {
    // The snout, and its ear flopped forward.
    ctx.beginPath();
    ctx.ellipse(hx + r * 1.15, hy + r * 0.15, r * 0.22, r * 0.4, 0, 0, Math.PI * 2);
    paint(ctx, shade(coat, 0.1));
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.3, hy - r * 0.8);
    ctx.lineTo(hx + r * 0.5, hy - r * 1.05);
    ctx.lineTo(hx + r * 0.45, hy - r * 0.35);
    paint(ctx, shade(coat, 0.06));
  } else if (kind === 'dog' || kind === 'sheep') {
    // A floppy ear (a sheep's sticks out sideways).
    ctx.beginPath();
    ctx.ellipse(hx - r * 0.55, hy - r * (kind === 'sheep' ? 0.3 : 0.1), r * 0.42, r * 0.22, kind === 'sheep' ? -0.3 : 1.2, 0, Math.PI * 2);
    paint(ctx, kind === 'sheep' ? C.ink : shade(coat, 0.3), { stroke: kind === 'dog' });
  }
  if (kind === 'sheep' && wool > 0.9) {
    // A woolly cap.
    ctx.beginPath();
    ctx.arc(hx - r * 0.25, hy - r * 0.75, r * 0.6, 0, Math.PI * 2);
    paint(ctx, o.color || COAT.sheep);
  }
  if (kind === 'goat' && Q.detail) {
    // A beard.
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.6, hy + r * 0.8);
    ctx.lineTo(hx + r * 0.4, hy + r * 1.6);
    inked(ctx, C.greyLight, 0.05);
  }
  // An eye (nobody sees two in profile).
  if (Q.detail) {
    ctx.beginPath();
    ctx.arc(hx + r * (kind === 'cat' ? 0.4 : 0.15), hy - r * 0.2, Math.max(0.028, r * 0.15), 0, Math.PI * 2);
    ctx.fillStyle = kind === 'sheep' ? C.white : C.ink;
    ctx.fill();
  }
}

// A hen: a round body, a fan of tail, two legs, a comb. Pecking, her head
// goes down to the ground and up.
function hen(ctx, b, pose, coat, o, t) {
  const walk = pose === 'walk' || pose === 'run';
  const sit = pose === 'sit' || pose === 'lie';
  const ph = (o.phase || 0) + t * (pose === 'run' ? 14 : 9);
  const peck = (pose === 'peck' || pose === 'graze') && Math.sin(t * 4 + (o.phase || 0)) > 0.2;
  const by = sit ? -b.body * 0.45 : -b.leg - b.body * 0.5 - (walk ? Math.abs(Math.sin(ph)) * 0.03 : 0);
  if (!sit) {
    const sw = walk ? Math.sin(ph) * 0.07 : 0;
    ctx.beginPath();
    ctx.moveTo(-0.04, by + b.body * 0.3); ctx.lineTo(-0.04 + sw, 0);
    ctx.moveTo(0.06, by + b.body * 0.3); ctx.lineTo(0.06 - sw, 0);
    ctx.strokeStyle = C.mustard;
    ctx.lineWidth = 0.045;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // The tail's fan and the body, in one shape.
  ctx.beginPath();
  ctx.ellipse(0, by, b.len * 0.5, b.body * 0.5, 0, 0, Math.PI * 2);
  ctx.moveTo(-b.len * 0.3, by - b.body * 0.1);
  ctx.lineTo(-b.len * 0.62, by - b.body * 0.75);
  ctx.lineTo(-b.len * 0.42, by + b.body * 0.15);
  paint(ctx, coat);
  if (watch.person) watch.person(ctx, 0, by, b.body * 0.42);
  const hx = peck ? b.len * 0.5 : b.len * 0.32, hy = peck ? -b.head * 0.9 : by - b.neck[1];
  ctx.beginPath();
  ctx.moveTo(b.len * 0.2, by - b.body * 0.15);
  ctx.lineTo(hx, hy);
  inked(ctx, coat, b.head * 1.2);
  ctx.beginPath();
  ctx.arc(hx, hy, b.head, 0, Math.PI * 2);
  paint(ctx, coat);
  // The comb and the beak.
  ctx.beginPath();
  ctx.arc(hx - 0.01, hy - b.head * 1.05, b.head * 0.45, Math.PI, 0);
  ctx.moveTo(hx + b.head * 0.9, hy - b.head * 0.25);
  ctx.lineTo(hx + b.head * 1.7, hy + b.head * 0.1);
  ctx.lineTo(hx + b.head * 0.9, hy + b.head * 0.35);
  paint(ctx, C.red, { lw: 0.03 });
  if (Q.detail) {
    ctx.beginPath();
    ctx.arc(hx + b.head * 0.3, hy - b.head * 0.15, 0.022, 0, Math.PI * 2);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
}

// Where to put a tag over an animal, or the middle of a tap on it: how tall
// it stands, in the same units as z.
export const animalTop = (kind, scale = 1) => (BUILD[kind] ? BUILD[kind].top : 1) * scale / ZK;
