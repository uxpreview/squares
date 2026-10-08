// Touch, mouse, wheel and keys on the canvas: drag to pan (with a little
// inertia), pinch or scroll to zoom, double-tap to zoom in (or back out from
// the closest), tap to act. What a tap means is up to the game.
//
// Keys, while the canvas has focus (it's a Tab stop while input is on): the
// arrows (or WASD) move the map under the aim, a point in the middle of the
// picture, and where the map can't go any further (its edge, or all of it
// on screen) the aim moves instead; + and - zoom round it; Enter or Space
// taps it. A click doesn't give the canvas focus, so for the mouse the
// arrows stay the game's.
//
// The map has soft edges (camera.range): drag past one and it gives, let go
// and it springs back, so it can't be lost off screen.
//
// on: {
//   down()          any touch, wheel or key (stops camera flights and drifts)
//   tap(sx, sy)     a press and release that didn't move; true if it did
//                   something (then it can't start a double tap)
//   settle()        panning or zooming has come to rest
//   clampZoom(z)    keep the zoom in range
//   area()          optional: the picture's part of the screen, clear of the
//                   UI, [left, top, right, bottom] (default: all of it); the
//                   aim starts in its middle and stays inside it
// }

export function attachInput(canvas, camera, on) {
  const { cam, view } = camera;
  const pointers = new Map();
  // drag.raw and glide: where the finger (or the fling) would put the camera,
  // before the edges have their say. The camera shows camera.give(raw).
  let drag = null, pinch = null, vel = { x: 0, y: 0 }, glide = null, spring = false;
  let wheelTimer = 0;
  let enabled = true;
  // The last tap, for telling a double tap: a second tap this soon and this
  // near zooms instead of tapping again.
  let lastTap = null;
  // Arrow keys held down, and for how long (a short press nudges, for lining
  // up on something small; held, it picks up speed).
  const held = new Set();
  let heldFor = 0;
  // How far the aim is off the middle of the picture, in px.
  const off = { x: 0, y: 0 };

  const show = (p) => {
    const g = camera.give(p);
    cam.x = g.x;
    cam.y = g.y;
  };
  const outside = () => {
    const c = camera.clamp(cam);
    return Math.hypot(c.x - cam.x, c.y - cam.y) * cam.z > 0.5;
  };
  // Hands off: glide if it was flung, spring back if it's past an edge,
  // otherwise it has come to rest.
  function letGo(flung) {
    if (flung) glide = camera.ungive(cam);
    else if (outside()) spring = true;
    else if (!camera.flying) on.settle(); // a tap may have started a flight into a zone; let it land
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!enabled) return;
    // A new touch with no other finger down starts afresh: a finger whose
    // lift was never reported (a system gesture, a lost capture) would
    // otherwise still count, and the next drag would pinch against it.
    if (e.isPrimary) { pointers.clear(); drag = pinch = null; recenter(); }
    // (A third finger is ignored: a pinch is two.)
    if (pointers.size >= 2) return;
    // (Capture can fail for a pointer the browser has already let go of.)
    try { canvas.setPointerCapture(e.pointerId); } catch { /* still tracked */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    glide = null;
    spring = false;
    on.down();
    if (pointers.size === 1) {
      drag = { sx: e.clientX, sy: e.clientY, moved: false, t: performance.now(), raw: camera.ungive(cam) };
      vel = { x: 0, y: 0 };
    } else if (pointers.size === 2) {
      // Pinch around the world point between the fingers: it stays under them.
      const [a, b] = [...pointers.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const raw = camera.ungive(cam);
      pinch = {
        d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z,
        wx: raw.x + (mx - view.vw / 2) / cam.z, wy: raw.y + (my - view.vh / 2) / cam.z,
      };
      if (drag) drag.moved = true;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = pointers.get(e.pointerId);
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size === 1 && drag) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
      if (drag.moved) {
        drag.raw.x -= dx / cam.z;
        drag.raw.y -= dy / cam.z;
        show(drag.raw);
        const now = performance.now();
        const ddt = Math.max(1, now - drag.t);
        vel = { x: (-dx / cam.z) / ddt * 16, y: (-dy / cam.z) / ddt * 16 };
        drag.t = now;
      }
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.z = on.clampZoom(pinch.z * (d / pinch.d));
      show({ x: pinch.wx - (mx - view.vw / 2) / cam.z, y: pinch.wy - (my - view.vh / 2) / cam.z });
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      const tapped = drag && !drag.moved && e.type === 'pointerup';
      const flung = !!drag && drag.moved && performance.now() - drag.t < 80;
      drag = null;
      pinch = null;
      if (tapped) {
        const now = performance.now();
        if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) {
          lastTap = null;
          zoomAt(e.clientX, e.clientY);
          return;
        }
        const acted = on.tap(e.clientX, e.clientY);
        // (A tap that did something, opened a drawer or flew into a room,
        // isn't half a double tap: a quick second one there is another tap.)
        lastTap = acted || camera.flying ? null : { t: now, x: e.clientX, y: e.clientY };
        if (!camera.flying) on.settle();
      } else letGo(flung);
    } else if (pointers.size === 1) {
      // One finger lifted from a pinch: the other carries on dragging.
      pinch = null;
      const [p] = [...pointers.values()];
      drag = { sx: p.x, sy: p.y, moved: true, t: performance.now(), raw: camera.ungive(cam) };
      vel = { x: 0, y: 0 };
    }
  }
  // Double tap: twice as close, round the spot tapped (it stays under the
  // finger). Already as close as it goes, it backs out instead.
  function zoomAt(sx, sy) {
    const [wx, wy] = camera.toWorld(sx, sy);
    let z = on.clampZoom(cam.z * 2);
    if (z < cam.z * 1.1) z = on.clampZoom(cam.z / 2.5);
    const to = camera.clamp({ x: wx - (sx - view.vw / 2) / z, y: wy - (sy - view.vh / 2) / z, z });
    camera.flyTo(to, 0.35, on.settle);
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('lostpointercapture', endPointer);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!enabled) return;
    glide = null;
    spring = false;
    on.down();
    const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    const [wx, wy] = camera.toWorld(e.clientX, e.clientY);
    cam.z = on.clampZoom(cam.z * f);
    // Zooming out by an edge pulls the map back in rather than stretching it.
    Object.assign(cam, camera.clamp({ x: wx - (e.clientX - view.vw / 2) / cam.z, y: wy - (e.clientY - view.vh / 2) / cam.z, z: cam.z }));
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(on.settle, 250);
  }, { passive: false });

  // ---------- Keys ----------
  const PAN = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1],
  };
  const keyOf = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
  const area = () => (on.area ? on.area() : [0, 0, view.vw, view.vh]);
  // Where the keys tap: the middle of the picture, plus the aim's offset
  // (kept a little inside the picture's edges).
  function aim() {
    const [l, t, r, b] = area(), m = 20;
    const hx = Math.max(0, (r - l) / 2 - m), hy = Math.max(0, (b - t) / 2 - m);
    off.x = Math.max(-hx, Math.min(hx, off.x));
    off.y = Math.max(-hy, Math.min(hy, off.y));
    return [(l + r) / 2 + off.x, (t + b) / 2 + off.y];
  }
  const recenter = () => { off.x = off.y = 0; };
  // A click mustn't focus the map (the arrows would stop changing rooms for
  // the mouse); Tab does. It still takes focus off a button, as a click
  // anywhere else on the page would.
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const a = document.activeElement;
    if (a && a !== canvas && a !== document.body && a.blur) a.blur();
  });
  canvas.addEventListener('keydown', (e) => {
    if (!enabled || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = keyOf(e);
    if (PAN[k]) {
      e.preventDefault();
      if (!held.size) {
        on.down();
        glide = null;
        spring = false;
        heldFor = 0;
      }
      held.add(k);
    } else if (k === '+' || k === '=' || k === '-' || k === '_') {
      e.preventDefault();
      on.down();
      const [sx, sy] = aim();
      zoomBy(k === '-' || k === '_' ? 1 / 1.6 : 1.6, sx, sy);
    } else if (k === 'Escape') {
      recenter(); // (the game takes it from here: back out a level)
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (e.repeat) return;
      on.down();
      const [sx, sy] = aim();
      on.tap(sx, sy);
      // (Flying somewhere new, the aim goes back to the middle.)
      if (camera.flying) recenter();
      else on.settle();
    }
  });
  const letKeysGo = () => {
    if (!held.size) return;
    held.clear();
    if (!camera.flying) on.settle();
  };
  canvas.addEventListener('keyup', (e) => {
    if (held.delete(keyOf(e)) && !held.size && !camera.flying) on.settle();
  });
  canvas.addEventListener('blur', letKeysGo);
  // Zoom by f round a point on screen (it stays put), in a quick flight.
  function zoomBy(f, sx, sy) {
    const [wx, wy] = camera.toWorld(sx, sy);
    const z = on.clampZoom(cam.z * f);
    if (Math.abs(z - cam.z) < cam.z * 0.01) return;
    // (The point under the aim stays under it: the aim stays where it is.)
    camera.flyTo(camera.clamp({ x: wx - (sx - view.vw / 2) / z, y: wy - (sy - view.vh / 2) / z, z }), 0.25, on.settle, { straight: true });
  }
  // The held arrows move the map, slowly at first, then quicker, up to about
  // a screen a second. Off the middle, the aim comes back first; then the
  // map moves, as far as its edges let it (no spring for keys); the aim
  // takes what's left, so it can reach anything on screen.
  function keyPan(dt) {
    heldFor += dt;
    let dx = 0, dy = 0;
    for (const k of held) { dx += PAN[k][0]; dy += PAN[k][1]; }
    const n = Math.hypot(dx, dy);
    if (!n) return;
    const px = Math.min(view.vw, view.vh) * Math.min(1, 0.22 + heldFor * 0.7) * dt;
    for (const [a, d] of [['x', dx / n], ['y', dy / n]]) {
      let m = d * px;
      if (!m) continue;
      if (off[a] && Math.sign(m) !== Math.sign(off[a])) {
        const back = Math.sign(m) * Math.min(Math.abs(m), Math.abs(off[a]));
        off[a] += back;
        m -= back;
      }
      const was = cam[a];
      cam[a] = camera.clamp({ ...cam, [a]: cam[a] + m / cam.z })[a];
      off[a] += m - (cam[a] - was) * cam.z;
    }
    aim(); // (keeps the aim inside the picture)
  }

  function step(dt) {
    if (held.size && !camera.flying && !drag && !pinch) { keyPan(dt); return; }
    if (drag || pinch || (!glide && !spring)) return;
    if (camera.flying || camera.drifting) { glide = null; spring = false; return; }
    const f = dt * 60; // frames at 60 a second, so a fling travels as far at any frame rate
    if (glide) {
      glide.x += vel.x * f;
      glide.y += vel.y * f;
      let brake = Math.pow(0.92, f);
      // Past an edge it brakes hard, then springs back.
      const r = camera.range();
      if (r && (glide.x < r.x0 || glide.x > r.x1 || glide.y < r.y0 || glide.y > r.y1)) brake = Math.pow(0.7, f);
      vel.x *= brake;
      vel.y *= brake;
      show(glide);
      if (Math.hypot(vel.x, vel.y) * cam.z < 0.05) {
        glide = null;
        letGo(false);
      }
      return;
    }
    const c = camera.clamp(cam);
    const k = 1 - Math.exp(-dt * 14);
    cam.x += (c.x - cam.x) * k;
    cam.y += (c.y - cam.y) * k;
    if (Math.hypot(c.x - cam.x, c.y - cam.y) * cam.z < 0.25) {
      cam.x = c.x;
      cam.y = c.y;
      spring = false;
      on.settle();
    }
  }

  return {
    step,
    // Where the keys tap now (the game draws its mark there).
    aim,
    // True while the camera is being moved by hand (don't bake caches yet).
    get busy() { return !!pinch || !!glide || spring || held.size > 0; },
    setEnabled(v) {
      enabled = v;
      // (A Tab stop only while there's something to steer.)
      canvas.tabIndex = v ? 0 : -1;
      if (!v && document.activeElement === canvas) canvas.blur();
      if (!v) { pointers.clear(); held.clear(); drag = pinch = glide = lastTap = null; spring = false; }
    },
  };
}
