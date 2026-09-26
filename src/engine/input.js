// Touch, mouse and wheel on the canvas: drag to pan (with a little inertia),
// pinch or scroll to zoom, tap to act. What a tap means is up to the game.
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
  let drag = null, pinch = null, vel = { x: 0, y: 0 }, inertia = false;
  let wheelTimer = 0;
  let enabled = true;

  canvas.addEventListener('pointerdown', (e) => {
    if (!enabled) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    inertia = false;
    on.down();
    if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, t: performance.now() };
      vel = { x: 0, y: 0 };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
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
        cam.x -= dx / cam.z;
        cam.y -= dy / cam.z;
        const now = performance.now();
        const ddt = Math.max(1, now - drag.t);
        vel = { x: (-dx / cam.z) / ddt * 16, y: (-dy / cam.z) / ddt * 16 };
        drag.t = now;
      }
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const [wx, wy] = camera.toWorld(pinch.mx, pinch.my);
      cam.z = on.clampZoom(pinch.z * (d / pinch.d));
      cam.x = wx - (mx - view.vw / 2) / cam.z;
      cam.y = wy - (my - view.vh / 2) / cam.z;
      pinch.mx = mx;
      pinch.my = my;
      pinch.z = cam.z;
      pinch.d = d;
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      if (drag && !drag.moved && e.type === 'pointerup') on.tap(e.clientX, e.clientY);
      else if (drag && drag.moved) inertia = performance.now() - drag.t < 80;
      drag = null;
      pinch = null;
      // A tap may have started a flight into a zone; let it land before judging the zoom.
      if (!camera.flying) on.settle();
    } else if (pointers.size === 1) {
      pinch = null;
      const [p] = [...pointers.values()];
      drag = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: true, t: performance.now() };
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!enabled) return;
    inertia = false;
    on.down();
    const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    const [wx, wy] = camera.toWorld(e.clientX, e.clientY);
    cam.z = on.clampZoom(cam.z * f);
    cam.x = wx - (e.clientX - view.vw / 2) / cam.z;
    cam.y = wy - (e.clientY - view.vh / 2) / cam.z;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(on.settle, 250);
  }, { passive: false });

  function step(dt) {
    if (!inertia) return;
    cam.x += vel.x * dt * 60;
    cam.y += vel.y * dt * 60;
    vel.x *= 0.92;
    vel.y *= 0.92;
    if (Math.hypot(vel.x, vel.y) * cam.z < 0.05) inertia = false;
  }

  return {
    step,
    // True while the camera is being moved by hand (don't bake caches yet).
    get busy() { return !!pinch || inertia; },
    setEnabled(v) {
      enabled = v;
      if (!v) { pointers.clear(); drag = pinch = null; inertia = false; }
    },
  };
}
