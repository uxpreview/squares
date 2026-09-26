// Draws a world through the camera, every frame.
//
// Only the zone you're in is drawn live. Every other visible zone is a snapshot
// bitmap, and snapshots are re-rendered a few per frame (oldest first) within a
// small time budget, so the whole map keeps moving without the cost.

import { isoX, isoY } from './iso.js';
import { C, Q, setScreen } from './art.js';
import {
  drawZoneVector, snapshotZone, drawSnapshot, bakeBackdrop, drawBackdrop, dropBackdrop, dropSnapshot,
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

// Cutaway "above": how far a lifted zone rises (world iso units) and how faint it gets.
const LIFT = 9;
const GHOST = 0.1;

export function createRenderer(canvas, camera) {
  // alpha: true on purpose. iOS 26 Safari clips an opaque full-screen layer at its
  // status bar and toolbar and paints a flat color there instead; a non-opaque
  // layer is composited normally, so the plate shows through behind the glass.
  const ctx = canvas.getContext('2d', { alpha: true });
  const { cam, view } = camera;
  const perf = { ms: 0, snap: 0, focus: 0, gap: 16 };
  let snapCredit = 0;
  let lastT = 0;
  let slowFrames = 0;
  let intro = null;

  // Each frame earns SNAP_BUDGET_MS of credit; a snapshot spends what it actually
  // took. Expensive snapshots (big, zoomed in) therefore happen less often.
  function refreshSnapshots(list, t, k) {
    const want = snapScaleFor(k);
    // Catch up faster when neighbors are still at a much lower resolution than the view.
    const blurry = list.some((z) => z.snapScale && z.snapScale < want * 0.5);
    const budget = blurry ? SNAP_BUDGET_MS * 2.5 : SNAP_BUDGET_MS;
    snapCredit = Math.min(snapCredit + budget, budget * 3);
    const order = list.slice().sort((a, b) =>
      (a.snap ? 1 : 0) - (b.snap ? 1 : 0) ||
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

  // Drop from 3x to 2x if frames stay slow (under ~35 fps) for a couple of seconds.
  function watchFrameRate(gap, world) {
    if (!(gap > 0) || gap > 0.25 || document.hidden) return; // tab switches, first frame
    perf.gap = perf.gap * 0.95 + gap * 1000 * 0.05;
    if (view.dpr <= 2 || performance.now() < 4000) return;
    slowFrames = perf.gap > 28 ? slowFrames + 1 : 0;
    if (slowFrames > 90) {
      view.dprCap = 2;
      slowFrames = 0;
      camera.measure();
      if (world) for (const z of world.zones) dropBackdrop(z);
    }
  }

  // Opening: zones drop onto the plate back to front, bottom to top.
  function startIntro(world) {
    const delays = new Map();
    let end = 0;
    for (const z of world.zones) {
      const d = ((z.ox + z.oy) / 21 + z.oz / 10) * 95 + ((z.index * 53) % 60);
      delays.set(z, d);
      end = Math.max(end, d + 800);
    }
    intro = { t0: performance.now() + 150, delays, end };
  }
  function introDrop(z, now) {
    if (!intro) return null;
    if (now - intro.t0 > intro.end) { intro = null; return null; }
    const k = (now - intro.t0 - intro.delays.get(z)) / 780;
    if (k >= 1) return null;
    if (k <= 0) return { dy: -12, a: 0 };
    const c = 1.9; // ease-out-back: overshoot a touch, then settle
    const e = 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
    return { dy: -12 * (1 - e), a: Math.min(1, k * 2.5) };
  }

  // The focus zone's outline, as a hole in a screen-sized rect: clipping to it
  // with evenodd cuts zones in front of the focus away around it.
  function cutPath(focus) {
    const [fx, fy] = focus.anchor;
    const H = focus.h + 0.3;
    const t0 = -0.45; // wall thickness
    const { w, d } = focus;
    const sil = [[t0, d, H], [t0, t0, H], [w, t0, H], [w, t0, -1.1], [w, d, -1.1], [t0, d, -1.1]];
    const { box } = view;
    const [w0x, w0y] = camera.toWorld(box.x - 10, box.y - 10);
    const [w1x, w1y] = camera.toWorld(box.x + box.w + 10, box.y + box.h + 10);
    const cut = new Path2D();
    cut.rect(w0x, w0y, w1x - w0x, w1y - w0y);
    sil.forEach(([x, y, z], i) => {
      const X = fx + isoX(x, y), Y = fy + isoY(x, y, z);
      i ? cut.lineTo(X, Y) : cut.moveTo(X, Y);
    });
    cut.closePath();
    return cut;
  }

  // o: { t, now, focus, still, fx, marks(ctx, zone, t, now), top(ctx, t, now) }
  function render(world, o) {
    const f0 = performance.now();
    const { t, now, focus } = o;
    const dt = Math.min(0.05, t - lastT || 0);
    watchFrameRate(t - lastT, world);
    lastT = t;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!world) return;
    const { dpr, box } = view;
    const k = cam.z * dpr;
    ctx.setTransform(k, 0, 0, k, dpr * (view.vw / 2 - cam.x * cam.z - box.x), dpr * (view.vh / 2 - cam.y * cam.z - box.y));
    setScreen(k, dpr);
    Q.lines = true;
    Q.detail = true;
    if (world.map.backdrop) world.map.backdrop(ctx, t, world);

    // Cutaways
    for (const z of world.zones) if (z !== focus && z.backdrop) dropBackdrop(z);
    const cut = focus && world.cutaway.front ? cutPath(focus) : null;
    for (const z of world.zones) {
      const up = focus && world.cutaway.above && z.oz > focus.oz + 0.1 ? 1 : 0;
      z.veil += (up - z.veil) * Math.min(1, dt * 7);
      if (Math.abs(z.veil - up) < 0.002) z.veil = up;
      z.lift = z.veil * LIFT; // hit testing reads this, so taps land where the zone is drawn
    }

    const visible = world.drawOrder.filter((z) => {
      const [ax, ay] = z.anchor;
      const b = z.bounds;
      const [sx0, sy0] = camera.toScreen(ax + b.x0, ay + b.y0 - z.lift);
      const [sx1, sy1] = camera.toScreen(ax + b.x1, ay + b.y1 - z.lift);
      return !(sx1 < box.x || sx0 > box.x + box.w || sy1 < box.y || sy0 > box.y + box.h);
    });
    // Let go of big pictures of zones that have been off screen for a while.
    for (const z of world.zones) if (z.snap && z.snapScale >= 17 && t - z.snapT > 6 && !visible.includes(z)) dropSnapshot(z);
    const p0 = performance.now();
    refreshSnapshots(visible.filter((z) => z !== focus), t, k);
    perf.snap = perf.snap * 0.9 + (performance.now() - p0) * 0.1;
    setScreen(k, dpr);

    for (const z of visible) {
      const [ax, ay] = z.anchor;
      const drop = introDrop(z, now);
      if (drop && drop.a <= 0) continue;
      ctx.save();
      if (cut && z !== focus && z.ox + z.oy > focus.ox + focus.oy + 0.01 && Math.abs(z.oz - focus.oz) < focus.h) ctx.clip(cut, 'evenodd');
      ctx.translate(ax, ay - z.lift);
      let a = 1 - (1 - GHOST) * z.veil;
      if (drop) { ctx.translate(0, drop.dy); a *= drop.a; }
      if (a < 1) ctx.globalAlpha = a;
      if (z === focus) {
        const q0 = performance.now();
        Q.lines = k > 6;
        Q.detail = k > 4.5;
        // Cache the backdrop once the camera settles; redraw it live while it moves.
        if (o.still && z.backdropScale !== k) { bakeBackdrop(z, k, dpr); setScreen(k, dpr); }
        if (o.still && z.backdrop) {
          drawBackdrop(ctx, z);
          drawZoneVector(ctx, z, t, true);
        } else {
          drawZoneVector(ctx, z, t);
        }
        perf.focus = perf.focus * 0.9 + (performance.now() - q0) * 0.1;
      } else if (!z.snap) {
        Q.lines = k > 6;
        Q.detail = k > 4.5;
        drawZoneVector(ctx, z, t);
      } else {
        drawSnapshot(ctx, z);
      }
      Q.lines = true;
      Q.detail = true;
      if (o.marks && z.veil < 0.5) o.marks(ctx, z, t, now);
      ctx.restore();
    }
    Q.detail = k > 4.5;
    if (world.map.sky) world.map.sky(ctx, t, world, o.fx || {});
    Q.detail = true;
    if (o.top) o.top(ctx, t, now);
    perf.ms = perf.ms * 0.9 + (performance.now() - f0) * 0.1;
  }

  // A small still picture of a whole map, for the level picker.
  function thumbnail(world, w, h, t = 6) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d');
    const [X0, X1, Y0, Y1] = world.overviewBox(false);
    const z = Math.min(w / (X1 - X0), h / (Y1 - Y0)) * 1.12;
    const k = z * dpr;
    g.setTransform(k, 0, 0, k, cv.width / 2 - ((X0 + X1) / 2) * k, cv.height / 2 - ((Y0 + Y1) / 2) * k);
    setScreen(k, dpr);
    Q.lines = k > 6;
    Q.detail = false;
    for (const zone of world.drawOrder) {
      g.save();
      g.translate(zone.anchor[0], zone.anchor[1]);
      drawZoneVector(g, zone, t);
      g.restore();
    }
    Q.lines = true;
    Q.detail = true;
    return cv;
  }

  // Free every bitmap a world holds (when switching maps).
  function dispose(world) {
    if (!world) return;
    for (const z of world.zones) { dropSnapshot(z); dropBackdrop(z); z.veil = 0; z.lift = 0; }
  }

  return { render, startIntro, thumbnail, dispose, perf, ctx };
}
