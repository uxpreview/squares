// The camera: where we look (x, y in world iso units) and how close (z = px per unit).
// Also the viewport it frames, camera flights between views, and a slow idle
// drift for the title screen.

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function createCamera(canvas, o = {}) {
  const reduceMotion = !!o.reduceMotion;
  // vw/vh: the visible viewport (what the camera frames).
  // box: where the canvas actually sits, which can bleed past the viewport on iOS.
  const view = { vw: 0, vh: 0, dpr: 1, dprCap: 3, box: { x: 0, y: 0, w: 0, h: 0 } };
  const cam = { x: 0, y: 0, z: 4 };
  let flight = null;
  let drift = null;

  function measure() {
    view.dpr = Math.min(window.devicePixelRatio || 1, view.dprCap);
    view.vw = window.innerWidth;
    view.vh = window.innerHeight;
    const r = canvas.getBoundingClientRect();
    Object.assign(view.box, { x: r.left, y: r.top, w: r.width, h: r.height });
    canvas.width = Math.round(view.box.w * view.dpr);
    canvas.height = Math.round(view.box.h * view.dpr);
  }

  // Frame the box [X0, X1, Y0, Y1] inside the screen minus `insets` (UI chrome).
  function fit([X0, X1, Y0, Y1], s = { top: 0, bottom: 0, left: 0, right: 0 }, pad = 0) {
    const aw = view.vw - s.left - s.right, ah = view.vh - s.top - s.bottom;
    const z = Math.min(aw / (X1 - X0 + pad * 2), ah / (Y1 - Y0 + pad * 2));
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
    // shift so the content centers inside the free area, not the whole screen
    const offX = (s.left - s.right) / 2, offY = (s.top - s.bottom) / 2;
    return { x: cx - offX / z, y: cy - offY / z, z };
  }

  function flyTo(to, dur = 1.6, then) {
    drift = null;
    if (reduceMotion) dur = 0.01;
    const from = { ...cam };
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    // Pull back a little mid-flight on long hops, like a camera on a crane.
    const arc = Math.min(0.55, (dist * Math.min(from.z, to.z)) / (view.vw * 3));
    flight = { from, to, t0: performance.now(), dur: dur * 1000, arc, then };
  }

  function jumpTo(v) {
    flight = null;
    Object.assign(cam, v);
  }

  // A slow, looping float around a view. Used behind the title screen.
  // If the camera is somewhere else (say, zoomed into a room), it flies there first.
  function startDrift(around) {
    if (reduceMotion) { jumpTo(around); return; }
    const far = Math.hypot(cam.x - around.x, cam.y - around.y) * around.z + Math.abs(Math.log(cam.z / around.z)) * 400;
    const begin = () => { drift = { around, t0: performance.now() }; };
    if (far > 40) flyTo(around, 1.4, begin);
    else { flight = null; begin(); }
  }

  function step(now) {
    if (flight) {
      const k = Math.min(1, (now - flight.t0) / flight.dur);
      const e = easeInOut(k);
      const { from, to, arc } = flight;
      cam.x = from.x + (to.x - from.x) * e;
      cam.y = from.y + (to.y - from.y) * e;
      const lz = Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * e;
      cam.z = Math.exp(lz - arc * Math.sin(Math.PI * e));
      if (k >= 1) {
        const then = flight.then;
        flight = null;
        if (then) then();
      }
      return;
    }
    if (drift) {
      const s = (now - drift.t0) / 1000;
      const a = drift.around;
      // Ease in over the first few seconds so the drift never starts with a jolt.
      const k = Math.min(1, s / 4);
      const r = 26 / a.z; // screen px of travel, in world units
      cam.x = a.x + Math.sin(s * 0.11) * r * 1.6 * k;
      cam.y = a.y + Math.sin(s * 0.083 + 1) * r * k;
      cam.z = a.z * (1 + 0.05 * k * (0.5 + 0.5 * Math.sin(s * 0.06)));
    }
  }

  function stop() {
    flight = null;
    drift = null;
  }

  const toScreen = (X, Y) => [(X - cam.x) * cam.z + view.vw / 2, (Y - cam.y) * cam.z + view.vh / 2];
  const toWorld = (sx, sy) => [(sx - view.vw / 2) / cam.z + cam.x, (sy - view.vh / 2) / cam.z + cam.y];

  return {
    cam,
    view,
    measure,
    fit,
    flyTo,
    jumpTo,
    startDrift,
    step,
    stop,
    toScreen,
    toWorld,
    get flying() { return !!flight; },
    get drifting() { return !!drift; },
  };
}
