// Draws a world through the camera, every frame.
//
// Only the zone you're in is drawn live. Every other visible zone is a snapshot
// bitmap, and snapshots are re-rendered a few per frame (oldest first) within a
// small time budget, so the whole map keeps moving without the cost.
//
// What's drawn is chunks (world.drawOrder): a zone up to 16 x 16 is one chunk,
// a bigger one several (see "Chunks" in zone.js). Pictures and caches belong
// to chunks; lifting, dimming and walls going up or down belong to zones.

import { isoX, isoY } from './iso.js';
import { inFront } from './world.js';
import { C, Q, setScreen } from './art.js';
import {
  drawZoneVector, snapshotZone, drawSnapshot, backdropFor, drawBackdrop, dropBackdrop, dropSnapshot, stillsFor, dropStills,
} from './zone.js';

// Neighbor picture sizes, in device px per unit. Pick the smallest step at or
// above the screen's scale: a bitmap drawn a bit smaller than it was rendered
// stays crisp; one stretched larger goes soft.
const SNAP_STEPS = [4, 5, 6, 7, 8, 10, 12, 14, 17, 20, 24, 28, 32];
const SNAP_CAP = 32;
const SNAP_BUDGET_MS = 6;
function snapScaleFor(k) {
  const need = Math.min(SNAP_CAP, k * 0.95);
  for (const v of SNAP_STEPS) if (v >= need) return v;
  return SNAP_CAP;
}

// Cutaway "above": how far a lifted zone rises (world iso units) and how faint
// it gets. Zones below the one you're in dim a little so it stands out. A map
// can change the first two (cutaway.lift, cutaway.ghost).
const LIFT = 9;
const GHOST = 0.1;
const BELOW = 0.55;

export function createRenderer(canvas, camera, o = {}) {
  // alpha: true on purpose. iOS 26 Safari clips an opaque full-screen layer at its
  // status bar and toolbar and paints a flat color there instead; a non-opaque
  // layer is composited normally, so the plate shows through behind the glass.
  const ctx = canvas.getContext('2d', { alpha: true });
  const { cam, view } = camera;
  // Frame costs in ms (smoothed): the whole render, refreshing neighbor pictures,
  // the zone you're in, the other zones, the backdrop and sky, and the frame gap.
  // n and worst count frames and keep the slowest since a tool last reset them
  // (QA times each view on its own frames that way).
  const perf = { ms: 0, snap: 0, focus: 0, zones: 0, back: 0, sky: 0, gap: 16, n: 0, worst: 0, total: 0, lays: 0, get snapQ() { return snapQ; } };
  let snapCredit = 0;
  let lastT = 0, lastFrame = 0;
  let slowFrames = 0;
  let intro = null;
  let caching = true; // tools can turn the room's caches off, to compare

  // Each frame earns SNAP_BUDGET_MS of credit; a snapshot spends what it actually
  // took. Expensive snapshots (big, zoomed in) therefore happen less often.
  // When there isn't time to spare (frames slower than about 40 a second),
  // the credit shrinks: the time a picture takes to draw here is only part of
  // what it costs, since the graphics chip then has to put it on screen. On
  // an older laptop the other rooms move in small steps instead of the whole
  // picture lagging; on a quick one nothing changes.
  let snapQ = 1, everything = false;
  function refreshSnapshots(list, t, k) {
    const want = snapScaleFor(k);
    snapQ = perf.gap > 25 ? Math.max(0.1, snapQ * 0.97) : Math.min(1, snapQ + 0.01);
    // Catch up faster when neighbors are still at a much lower resolution than the view.
    const blurry = list.some((z) => z.snapScale && z.snapScale < want * 0.5);
    let budget = blurry ? SNAP_BUDGET_MS * 2.5 : SNAP_BUDGET_MS * snapQ;
    // A tool taking a picture wants every neighbor at this moment, sharp.
    if (everything) { budget = Infinity; snapCredit = 0; everything = false; }
    snapCredit = Math.min(snapCredit + budget, budget * 3);
    // No picture yet first, then pictures that are out of date (walls moving),
    // then the wrong size, then the oldest.
    const order = list.slice().sort((a, b) =>
      (a.snap ? 1 : 0) - (b.snap ? 1 : 0) ||
      (a.stale ? 0 : 1) - (b.stale ? 0 : 1) ||
      (a.snapScale === want ? 1 : 0) - (b.snapScale === want ? 1 : 0) ||
      a.snapT - b.snapT);
    for (const z of order) {
      if (z.snap && snapCredit <= 0) break;
      const s0 = performance.now();
      // A zone with no picture yet always gets one now, but a cheap one if we're
      // out of time this frame; it sharpens up on a later frame.
      snapshotZone(z, z.snap || snapCredit > 0 ? want : Math.min(want, 8), t, view.dpr);
      snapCredit -= performance.now() - s0;
    }
  }

  // Sharpness follows the frame rate. If frames stay slow (under ~35 a
  // second) for a couple of seconds, it steps down: 3x to 2x, 2x to 1.5x,
  // and on the slowest machines 1.5x to 1.25x. An older laptop's graphics chip spends most of a frame putting
  // pixels on screen, and 1.5x is about half the pixels of 2x (the 2017
  // laptop's Plum Island went from 14-21 frames a second to 22-27). After a
  // few seconds at the screen's full rate it steps back up, waiting twice as
  // long each time a step up didn't hold. Tools keep one sharpness so their
  // measurements compare; one can switch this on with camera.view.dprAuto = true.
  const SHARP = [3, 2, 1.5, 1.25];
  let quickFrames = 0, upWait = 180, steppedUp = -1e9, settled = 0;
  function sharpness(cap, world) {
    view.dprCap = cap;
    slowFrames = quickFrames = 0;
    settled = performance.now() + 1500; // the step's own hitch isn't a slow frame
    camera.measure();
    if (world) for (const c of world.drawOrder) { dropBackdrop(c); dropStills(c); }
  }
  function watchFrameRate(gap, world) {
    if (!(gap > 0) || gap > 0.25 || document.hidden) return; // tab switches, first frame
    perf.gap = perf.gap * 0.95 + gap * 1000 * 0.05;
    const now = performance.now();
    if (now < 4000 || now < settled) return;
    if (!(view.dprAuto ?? !navigator.webdriver)) return;
    slowFrames = perf.gap > 28 ? slowFrames + 1 : 0;
    quickFrames = perf.gap < 18 ? quickFrames + 1 : 0;
    if (slowFrames > 90 && view.dpr > SHARP[SHARP.length - 1]) {
      if (now - steppedUp < 10000) upWait = Math.min(upWait * 2, 7200);
      sharpness(SHARP.find((s) => s < view.dpr), world);
    } else if (quickFrames > upWait && view.dprCap < SHARP[0] && (window.devicePixelRatio || 1) > view.dpr) {
      steppedUp = now;
      sharpness(SHARP[SHARP.indexOf(view.dprCap) - 1], world);
    }
  }

  // Opening: zones ink in back to front, settling the last hair into place.
  // Calm on purpose: nothing drops or bounces, and floors that are lifted out
  // of the way start there (settle) rather than floating off as you arrive.
  const INTRO_MS = 420;
  let settle = false;
  // instant: no inking in (the place grows out of its picker card instead).
  function startIntro(world, instant = false) {
    // With reduced motion, the place is simply there.
    if (o.reduceMotion || instant) { intro = null; settle = true; return; }
    const delays = new Map();
    let end = 0;
    for (const z of world.zones) {
      const d = ((z.ox + z.oy) / 21 + z.oz / 10) * 40 + ((z.index * 53) % 30);
      delays.set(z, Math.max(0, d));
      end = Math.max(end, d + INTRO_MS);
    }
    intro = { t0: performance.now() + 60, delays, end };
    settle = true;
  }
  function introDrop(z, now) {
    if (!intro) return null;
    if (now - intro.t0 > intro.end) { intro = null; return null; }
    const k = (now - intro.t0 - intro.delays.get(z)) / INTRO_MS;
    if (k >= 1) return null;
    if (k <= 0) return { dy: -1.2, a: 0 };
    const e = 1 - Math.pow(1 - k, 3); // ease out
    return { dy: -1.2 * (1 - e), a: e };
  }

  // The outline of the focus zone (or one of its chunks), as a hole in a
  // screen-sized rect: clipping to it with evenodd cuts what's in front of the
  // focus away around it.
  // drop: how far below its front edges it reaches (along x = its far x,
  // and y = its far y): down past the slab, or not at all.
  // hole: just the outline, to erase with (see "The cut layer" below).
  function cutPath(focus, rect = [0, 0, focus.w, focus.d], drop = [1.1, 1.1], hole = false) {
    const [fx, fy] = focus.anchor;
    const H = focus.h + 0.3;
    const t = -0.45; // wall thickness
    const [x0, y0, w, d] = [rect[0] ? rect[0] : t, rect[1] ? rect[1] : t, rect[2], rect[3]];
    let sil = [[x0, d, H], [x0, y0, H], [w, y0, H], [w, y0, -drop[0]], [w, d, -drop[0]], [w, d, -drop[1]], [x0, d, -drop[1]]];
    if (focus.ground) {
      // On ground with height, the outline's foot follows the ground along
      // its front edges (every half unit), and its top clears anything
      // standing on the highest of it. drop here: true to go down to the
      // plate's cut side, where nothing carries on in front.
      const g = focus.ground, top = focus.hi + H, n = (a, b) => Math.max(1, Math.ceil((b - a) / 0.5));
      const foot = (x, y, open) => (open ? focus.base - 0.3 : g(x, y));
      sil = [[x0, d, top], [x0, y0, top], [w, y0, top]];
      for (let k = 0, m = n(y0, d); k <= m; k++) { const y = y0 + ((d - y0) * k) / m; sil.push([w, y, foot(w, y, drop[0])]); }
      for (let k = 0, m = n(x0, w); k <= m; k++) { const x = w - ((w - x0) * k) / m; sil.push([x, d, foot(x, d, drop[1])]); }
    }
    const cut = new Path2D();
    if (!hole) {
      const { box } = view;
      const [w0x, w0y] = camera.toWorld(box.x - 10, box.y - 10);
      const [w1x, w1y] = camera.toWorld(box.x + box.w + 10, box.y + box.h + 10);
      cut.rect(w0x, w0y, w1x - w0x, w1y - w0y);
    }
    sil.forEach(([x, y, z], i) => {
      const X = fx + isoX(x, y), Y = fy + isoY(x, y, z);
      i ? cut.lineTo(X, Y) : cut.moveTo(X, Y);
    });
    cut.closePath();
    return cut;
  }

  // The cut layer. Chunks in front of the room you're in are cut away around
  // it. Clipping each one to the cut makes the browser build a full-screen
  // mask per chunk, every frame, which an older laptop's graphics can't keep
  // up with (a room at 5 to 15 fps, a street at 3). Instead they're drawn onto
  // a see-through sheet, the room's outline is erased from the sheet with
  // plain fills, and the sheet is laid on the picture: the same result.
  // The sheet holds chunks cut by the same outlines; a chunk that isn't cut
  // but overlaps what's on the sheet lays the sheet down first, so everything
  // still goes on in depth order.
  let sheet = null;
  function sheetCtx() {
    if (!sheet) sheet = document.createElement('canvas').getContext('2d', { alpha: true });
    if (sheet.canvas.width !== canvas.width || sheet.canvas.height !== canvas.height) {
      sheet.canvas.width = canvas.width;
      sheet.canvas.height = canvas.height;
    }
    return sheet;
  }

  // o: { t, now, focus, live, level, still, fx, marks(ctx, zone, t, now), top(ctx, t, now) }
  // live: a zone drawn every frame though you're not in it (an ending's)
  // level: the storey being looked at; zones on storeys above it lift out of the way.
  function render(world, o) {
    const f0 = performance.now();
    const { t, now, focus } = o;
    const dt = Math.max(0, Math.min(0.05, t - lastT || 0)); // the clock can jump (tools)
    // Real time between frames, not the scene's (which races when the clock skips ahead).
    watchFrameRate((f0 - lastFrame) / 1000, world);
    lastFrame = f0;
    lastT = t;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const plate = world && world.map.plate;
    ctx.fillStyle = (plate && (plate.at ? plate.at(t).paper : plate.paper)) || C.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!world) return;
    const { dpr, box } = view;
    const k = cam.z * dpr;
    ctx.setTransform(k, 0, 0, k, dpr * (view.vw / 2 - cam.x * cam.z - box.x), dpr * (view.vh / 2 - cam.y * cam.z - box.y));
    setScreen(k, dpr);
    Q.lines = true;
    Q.detail = true;

    // What a backdrop or sky might want: the visible world rect, the cutaway
    // around the zone you're in (to keep weather out of it), the storey.
    const [vx0, vy0] = camera.toWorld(box.x, box.y);
    const [vx1, vy1] = camera.toWorld(box.x + box.w, box.y + box.h);
    const level = o.level ?? world.top;
    const cut = focus && world.cutaway.front && !focus.open ? cutPath(focus) : null;
    // A chunk in front of any of the focus zone's chunks is cut away around
    // those (one chunk for a room, so its whole outline).
    // Outdoors (a zone without walls, like a street), the ground carries on
    // into whatever it touches, so the cut stops at the ground there instead
    // of showing the slab under it.
    const cuts = cut ? focus.chunks.map((c) => {
      if (focus.walls) return [c, cutPath(focus, focus.chunks.length > 1 ? c.rect : undefined, undefined, true)];
      const [x0, y0, x1, y1] = [c.ox, c.oy, c.ox + c.rect[2] - c.rect[0], c.oy + c.rect[3] - c.rect[1]];
      const touch = (fn) => world.drawOrder.some((o) => o !== c && Math.abs(o.oz - c.oz) < 0.05 && fn(o.ox, o.oy, o.ox + o.rect[2] - o.rect[0], o.oy + o.rect[3] - o.rect[1]));
      const tx = touch((a0, b0, a1, b1) => Math.abs(a0 - x1) < 0.01 && Math.min(b1, y1) - Math.max(b0, y0) > 0.01);
      const ty = touch((a0, b0, a1, b1) => Math.abs(b0 - y1) < 0.01 && Math.min(a1, x1) - Math.max(a0, x0) > 0.01);
      if (focus.ground) return [c, cutPath(focus, c.rect, [!tx, !ty], true)];
      return [c, cutPath(focus, c.rect, [tx ? 0 : 1.1, ty ? 0 : 1.1], true)];
    }) : null;
    const fx = { ...(o.fx || {}), view: [vx0, vy0, vx1, vy1], cut, level, focus };
    const b0 = performance.now();
    if (world.map.backdrop) world.map.backdrop(ctx, t, world, fx);
    perf.back = perf.back * 0.9 + (performance.now() - b0) * 0.1;

    // Cutaways
    const lift = world.cutaway.lift ?? LIFT;
    const ghost = world.cutaway.ghost ?? GHOST;
    for (const c of world.drawOrder) if (c.zone !== focus) { if (c.backdrop) dropBackdrop(c); if (c.stills) dropStills(c); }
    // (A street of houses lifts only the floors over the room you're in, in
    // its own house, and dims nothing.)
    const column = world.cutaway.above === 'column';
    // (Outdoors, a street or a park, nothing's over you.)
    const over = (z) => focus && !focus.fixed && z.oz > focus.oz + 0.05 && z.ox < focus.ox + focus.w - 0.01 && focus.ox < z.ox + z.w - 0.01 &&
      z.oy < focus.oy + focus.d - 0.01 && focus.oy < z.oy + z.d - 0.01;
    for (const z of world.zones) {
      const up = column ? (!z.fixed && over(z) ? 1 : 0) : world.cutaway.above && !z.fixed && z.storey > level ? 1 : 0;
      const down = !column && focus && world.cutaway.above && !z.fixed && !focus.fixed && z.storey < level ? 1 : 0;
      const ease = settle ? 1 : Math.min(1, dt * 7);
      z.veil += (up - z.veil) * ease;
      z.dim = (z.dim || 0) + (down - (z.dim || 0)) * ease;
      if (Math.abs(z.veil - up) < 0.002) z.veil = up;
      z.lift = z.veil * lift; // hit testing reads this, so taps land where the zone is drawn
      // Walls down: only the room you're in has its inside walls up.
      if (z.low != null) {
        const want = z === focus ? 1 : 0;
        const was = z.wallK;
        z.wallK += (want - z.wallK) * (settle ? 1 : Math.min(1, dt * 6));
        if (Math.abs(z.wallK - want) < 0.004) z.wallK = want;
        if (z.wallK !== was) for (const c of z.chunks) c.stale = true;
      }
      // A building's outside: gone while you're in it, back when you leave.
      if (z.shelled) {
        const want = z === focus ? 0 : 1;
        const was = z.shellK;
        z.shellK += (want - z.shellK) * (settle ? 1 : Math.min(1, dt * 6));
        if (Math.abs(z.shellK - want) < 0.004) z.shellK = want;
        if (z.shellK !== was) for (const c of z.chunks) c.stale = true;
      }
    }
    settle = false;

    const onScreen = (c) => {
      const [ax, ay] = c.zone.anchor;
      const b = c.bounds, lift = c.zone.lift;
      const [sx0, sy0] = camera.toScreen(ax + b.x0, ay + b.y0 - lift);
      const [sx1, sy1] = camera.toScreen(ax + b.x1, ay + b.y1 - lift);
      return [sx0, sy0, sx1, sy1];
    };
    const overlap = (a, b) => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
    // Each cutting outline's reach on screen (null when it's off screen).
    if (cuts) for (const cu of cuts) { const r = onScreen(cu[0]); cu[2] = overlap(r, [box.x, box.y, box.x + box.w, box.y + box.h]) ? r : null; }
    const visible = world.drawOrder.filter((c) => {
      const [sx0, sy0, sx1, sy1] = onScreen(c);
      return !(sx1 < box.x || sx0 > box.x + box.w || sy1 < box.y || sy0 > box.y + box.h);
    });
    // Let go of big pictures of chunks that have been off screen for a while.
    for (const c of world.drawOrder) if (c.snap && c.snapScale >= 17 && t - c.snapT > 6 && !visible.includes(c)) dropSnapshot(c);
    // A zone's pen marks go on after the last of its chunks.
    const lastOf = new Map();
    for (const c of visible) lastOf.set(c.zone, c);
    const p0 = performance.now();
    refreshSnapshots(visible.filter((c) => c.zone !== focus && c.zone !== o.live), t, k);
    perf.snap = perf.snap * 0.9 + (performance.now() - p0) * 0.1;
    setScreen(k, dpr);

    const zs0 = performance.now();
    let focusMs = 0;
    // What's on the cut sheet: which outlines cut it, and where it reaches on screen.
    const world0 = ctx.getTransform();
    let on = null;
    // Only the part of the sheet that's been drawn on is laid down (and
    // cleared next time), in whole device pixels.
    // (With room round it for pen circles by an edge and the opening fade-in.)
    const m = 24 + 1.5 * cam.z;
    const devRect = (r) => {
      const x0 = Math.max(0, Math.floor((r[0] - m - box.x) * dpr)), y0 = Math.max(0, Math.floor((r[1] - m - box.y) * dpr));
      const x1 = Math.min(canvas.width, Math.ceil((r[2] + m - box.x) * dpr)), y1 = Math.min(canvas.height, Math.ceil((r[3] + m - box.y) * dpr));
      return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
    };
    const layDown = () => {
      if (!on) return;
      perf.lays++; // (tools: how many sheets a frame takes)
      sheet.save();
      sheet.globalCompositeOperation = 'destination-out';
      for (const h of on.holes) sheet.fill(h[1]);
      sheet.restore();
      const r = devRect(on.reach);
      if (r) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(sheet.canvas, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]);
        ctx.restore();
        sheet.setTransform(1, 0, 0, 1, 0, 0);
        sheet.clearRect(r[0], r[1], r[2], r[3]);
      }
      on = null;
    };
    for (const c of visible) {
      const z = c.zone;
      const [ax, ay] = z.anchor;
      const drop = introDrop(z, now);
      if (drop && drop.a <= 0) continue;
      const reach = onScreen(c);
      // Only the outlines that are on screen and overlap this chunk cut it:
      // on a street, most of its pieces are elsewhere, and every different
      // set of outlines is another sheet to lay down.
      // (Outdoors, a closed building is never cut: the street runs past it,
      // and a strip of yard behind it would cut it to ribbons.)
      const by = cuts && z !== focus && !(focus.fixed && z.shelled && z.shellK > 0.5) &&
        ((world.cutaway.above === 'column' && !focus.fixed) || Math.abs(z.oz - focus.oz) < focus.h) ? cuts.filter(([f, , r]) => r && inFront(f, c) && overlap(r, reach)) : null;
      let g = ctx;
      if (by && by.length) {
        // It can go on the sheet that's out if the outlines that sheet will
        // erase and this chunk's own differ only where neither can touch:
        // none of the sheet's other outlines reach this chunk, and none of
        // this chunk's new ones reach what's already on the sheet. Otherwise
        // the sheet is laid down and a new one started.
        const fits = on && on.holes.every((h) => by.includes(h) || !overlap(h[2], reach))
          && by.every((h) => on.holes.includes(h) || !on.parts.some((r) => overlap(h[2], r)));
        if (on && !fits) layDown();
        if (!on) {
          sheetCtx().setTransform(world0);
          on = { holes: [], parts: [], reach: reach.slice() };
        }
        for (const h of by) if (!on.holes.includes(h)) on.holes.push(h);
        on.parts.push(reach);
        on.reach = [Math.min(on.reach[0], reach[0]), Math.min(on.reach[1], reach[1]), Math.max(on.reach[2], reach[2]), Math.max(on.reach[3], reach[3])];
        g = sheet;
      } else if (on && on.parts.some((r) => !(reach[2] < r[0] - 2 || reach[0] > r[2] + 2 || reach[3] < r[1] - 2 || reach[1] > r[3] + 2))) {
        // Something that isn't cut, overlapping what's on the sheet: the
        // sheet goes down first, so everything stays in depth order.
        layDown();
      }
      drawChunk(g, c, z, ax, ay, drop);
    }
    layDown();

    function drawChunk(ctx, c, z, ax, ay, drop) {
      ctx.save();
      ctx.translate(ax, ay - z.lift);
      let a = (1 - (1 - ghost) * z.veil) * (1 - (1 - BELOW) * z.dim);
      if (drop) { ctx.translate(0, drop.dy); a *= drop.a; }
      if (a < 1) ctx.globalAlpha = a;
      if (z === focus) {
        const q0 = performance.now();
        Q.lines = k > 6;
        Q.detail = k > 4.5;
        // Once the camera settles (and the walls have stopped moving), cache
        // the floor and walls, and every standing thing that doesn't move;
        // draw them live until then.
        const cache = o.still && !drop && caching;
        const st = cache ? stillsFor(ctx, c, k, dpr) : null;
        if (cache && backdropFor(ctx, c, k, dpr, t)) {
          drawBackdrop(ctx, c);
          drawZoneVector(ctx, c, t, true, st);
        } else {
          drawZoneVector(ctx, c, t, false, st);
        }
        focusMs += performance.now() - q0;
      } else if (!c.snap || z === o.live) {
        Q.lines = k > 6;
        Q.detail = k > 4.5;
        drawZoneVector(ctx, c, t);
      } else {
        drawSnapshot(ctx, c);
      }
      Q.lines = true;
      Q.detail = true;
      if (o.marks && z.veil < 0.5 && lastOf.get(z) === c) o.marks(ctx, z, t, now);
      ctx.restore();
    }
    if (focus) perf.focus = perf.focus * 0.9 + focusMs * 0.1;
    perf.zones = perf.zones * 0.9 + (performance.now() - zs0 - focusMs) * 0.1;
    Q.detail = k > 4.5;
    const s0 = performance.now();
    if (world.map.sky) world.map.sky(ctx, t, world, fx);
    perf.sky = perf.sky * 0.9 + (performance.now() - s0) * 0.1;
    Q.detail = true;
    if (o.top) o.top(ctx, t, now);
    const took = performance.now() - f0;
    perf.ms = perf.ms * 0.9 + took * 0.1;
    perf.n++;
    perf.total += took;
    perf.worst = Math.max(perf.worst, took);
  }

  // A small still picture of a whole map, for the level picker. A place printed
  // on its own plate (a night, say) gets its backdrop too, since that's its look.
  // A map can pick the moment it's shown at (plate.thumbAt, loop seconds).
  function thumbnail(world, w, h, t = 6) {
    if (world.map.plate && world.map.plate.thumbAt != null) t = world.map.plate.thumbAt;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d');
    const [X0, X1, Y0, Y1] = world.overviewBox(false);
    const z = Math.min(w / (X1 - X0), h / (Y1 - Y0)) * 1.12;
    const k = z * dpr;
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
    g.setTransform(k, 0, 0, k, cv.width / 2 - cx * k, cv.height / 2 - cy * k);
    setScreen(k, dpr);
    Q.lines = k > 6;
    Q.detail = false;
    const plate = world.map.plate;
    // A plate that bleeds (Plum Island, printed on the sea) fills the card
    // with its paper, so the picture runs to its edges there too.
    if (plate && plate.bleed) {
      const paper = plate.at ? plate.at(t).paper : plate.paper;
      if (paper) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = paper; g.fillRect(0, 0, cv.width, cv.height); g.restore(); }
    }
    const fx = { view: [cx - w / 2 / z, cy - h / 2 / z, cx + w / 2 / z, cy + h / 2 / z], level: world.top, thumb: true };
    if (plate && world.map.backdrop) world.map.backdrop(g, t, world, fx);
    for (const c of world.drawOrder) {
      g.save();
      g.translate(c.zone.anchor[0], c.zone.anchor[1]);
      drawZoneVector(g, c, t);
      g.restore();
    }
    if (plate && world.map.sky) world.map.sky(g, t, world, fx);
    Q.lines = true;
    Q.detail = true;
    return cv;
  }

  // Free every bitmap a world holds (when switching maps).
  function dispose(world) {
    if (!world) return;
    for (const c of world.drawOrder) {
      dropSnapshot(c);
      dropBackdrop(c);
      dropStills(c);
      c.stale = false;
    }
    for (const z of world.zones) {
      z.veil = 0; z.lift = 0; z.dim = 0;
      if (z.low != null) z.wallK = 0;
      if (z.shelled) z.shellK = 1;
    }
  }

  // Tools: jump every floor and wall to where it's heading on the next frame,
  // as if it had finished moving (QA times a room settled, not on its way in).
  const settleNow = () => { settle = true; };
  // Tools: redraw every other room's picture on the next frame, whatever it
  // costs (a headless browser paints so rarely they'd lag the clock).
  const refreshAll = () => { everything = true; };

  return {
    render, startIntro, thumbnail, dispose, settleNow, refreshAll, perf, ctx,
    get caching() { return caching; },
    set caching(v) { caching = !!v; },
  };
}
