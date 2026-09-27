// Touch, mouse and wheel on the canvas: drag to pan (with a little inertia),
// pinch or scroll to zoom, tap to act. What a tap means is up to the game.
//
// The map has soft edges (camera.range): drag past one and it gives, let go
// and it springs back, so it can't be lost off screen.
//
// on: {
//   down()          any touch or wheel (stops camera flights and drifts)
//   tap(sx, sy)     a press and release that didn't move
//   settle()        panning or zooming has come to rest
//   clampZoom(z)    keep the zoom in range
// }

export function attachInput(canvas, camera, on) {
  const { cam, view } = camera;
  const pointers = new Map();
  // drag.raw and glide: where the finger (or the fling) would put the camera,
  // before the edges have their say. The camera shows camera.give(raw).
  let drag = null, pinch = null, vel = { x: 0, y: 0 }, glide = null, spring = false;
  let wheelTimer = 0;
  let enabled = true;

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
    canvas.setPointerCapture(e.pointerId);
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
        on.tap(e.clientX, e.clientY);
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
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

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

  function step(dt) {
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
    // True while the camera is being moved by hand (don't bake caches yet).
    get busy() { return !!pinch || !!glide || spring; },
    setEnabled(v) {
      enabled = v;
      if (!v) { pointers.clear(); drag = pinch = glide = null; spring = false; }
    },
  };
}
