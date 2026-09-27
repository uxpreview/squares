// The camera: where we look (x, y in world iso units) and how close (z = px per unit).
// Also the viewport it frames, camera flights between views, a slow idle
// drift for the title screen, and the edges that keep the map on screen.

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// Past an edge the map follows the finger less and less, like a list on a
// phone: pulled a whole screen too far, it gives about a third of one.
// d: how far past, dim: the screen's size (both in world units).
const stretch = (d, dim) => (1 - 1 / ((d * 0.55) / dim + 1)) * dim;
const unstretch = (s, dim) => (dim / 0.55) * (1 / (1 - Math.min(s / dim, 0.99)) - 1);
const band = (v, lo, hi, dim) => (v < lo ? lo - stretch(lo - v, dim) : v > hi ? hi + stretch(v - hi, dim) : v);
const unband = (v, lo, hi, dim) => (v < lo ? lo - unstretch(lo - v, dim) : v > hi ? hi + unstretch(v - hi, dim) : v);

export function createCamera(canvas, o = {}) {
  const reduceMotion = !!o.reduceMotion;
  // vw/vh: the visible viewport (what the camera frames).
  // box: where the canvas actually sits, which can bleed past the viewport on iOS.
  const view = { vw: 0, vh: 0, dpr: 1, dprCap: 3, box: { x: 0, y: 0, w: 0, h: 0 } };
  const cam = { x: 0, y: 0, z: 4 };
  let flight = null;
  let drift = null;
  // bounds(): { box: [X0, X1, Y0, Y1], insets } or null. The game says where
  // the map is and how much of the screen it gets (the screen minus the UI).
  let bounds = null;

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
    // (Never less than a sliver of screen, whatever the UI claims.)
    const aw = Math.max(80, view.vw - s.left - s.right), ah = Math.max(80, view.vh - s.top - s.bottom);
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
      // (The frame's clock can read a moment before the flight began.)
      const k = Math.max(0, Math.min(1, (now - flight.t0) / flight.dur));
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

  // Where the camera may sit at zoom z: the map covers its part of the screen
  // (you can pan until an edge of the map meets an edge of that area), and
  // where it's smaller than that area it sits in the middle. Either way it
  // can't be panned out of sight. Returns the allowed x and y, or null.
  function range(z = cam.z) {
    const b = bounds && bounds();
    if (!b) return null;
    const [X0, X1, Y0, Y1] = b.box, s = b.insets;
    const ax = X0 + (view.vw / 2 - s.left) / z, bx = X1 - (view.vw / 2 - s.right) / z;
    const ay = Y0 + (view.vh / 2 - s.top) / z, by = Y1 - (view.vh / 2 - s.bottom) / z;
    const [x0, x1] = ax <= bx ? [ax, bx] : [(ax + bx) / 2, (ax + bx) / 2];
    const [y0, y1] = ay <= by ? [ay, by] : [(ay + by) / 2, (ay + by) / 2];
    return { x0, x1, y0, y1 };
  }

  // A view, moved as little as it takes to be in range.
  function clamp(v) {
    const r = range(v.z);
    if (!r) return { ...v };
    return { x: Math.min(r.x1, Math.max(r.x0, v.x)), y: Math.min(r.y1, Math.max(r.y0, v.y)), z: v.z };
  }

  // Hand input: where a position the finger asks for shows (give), and back
  // again (ungive), so a drag can pick up wherever the map is.
  function give(p, z = cam.z) {
    const r = range(z);
    if (!r) return { x: p.x, y: p.y };
    return { x: band(p.x, r.x0, r.x1, view.vw / z), y: band(p.y, r.y0, r.y1, view.vh / z) };
  }
  function ungive(p, z = cam.z) {
    const r = range(z);
    if (!r) return { x: p.x, y: p.y };
    return { x: unband(p.x, r.x0, r.x1, view.vw / z), y: unband(p.y, r.y0, r.y1, view.vh / z) };
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
    setBounds: (fn) => { bounds = fn; },
    range,
    clamp,
    give,
    ungive,
    get flying() { return !!flight; },
    get drifting() { return !!drift; },
  };
}
