// A stand-in canvas that draws nothing and remembers how far the ink went: the
// box, in the units it starts in, that a drawing covers. Still things are
// measured with it before they're cached (see zone.js), which is much quicker
// than drawing them and reading the pixels back.
//
// It errs big (a curve counts its control points, a stroke its widest corner).
// Anything it can't size up throws, and the thing is simply drawn live: shapes
// kept in a Path2D, shadows, filters, and drawing that mixes with what's under
// it (a glow screened over the room can't be drawn on its own and stamped down).

let measurer = null;
const measure = () => measurer || (measurer = document.createElement('canvas').getContext('2d'));

export function footprint() {
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const box = [Infinity, Infinity, -Infinity, -Infinity];
  let path = [Infinity, Infinity, -Infinity, -Infinity];
  let dash = [];

  const grow = (b, x, y) => {
    if (x < b[0]) b[0] = x;
    if (y < b[1]) b[1] = y;
    if (x > b[2]) b[2] = x;
    if (y > b[3]) b[3] = y;
  };
  const pt = (x, y) => grow(path, m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]);
  // A rectangle in the current units, turned and scaled into the root units.
  const quad = (b, x0, y0, x1, y1) => {
    for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) grow(b, m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]);
  };
  const scaleOf = () => Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
  const mul = (a, b, c, d, e, f) => {
    m = [
      m[0] * a + m[2] * b, m[1] * a + m[3] * b,
      m[0] * c + m[2] * d, m[1] * c + m[3] * d,
      m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5],
    ];
  };
  const no = (why) => { throw new Error('footprint: ' + why); };
  const plain = (g) => {
    if (g.globalCompositeOperation !== 'source-over') no('blends');
    if (g.shadowBlur > 0 || g.shadowOffsetX || g.shadowOffsetY) no('shadow');
    if (g.filter && g.filter !== 'none') no('filter');
  };
  const ink = (b, pad = 0) => {
    if (!(b[0] <= b[2])) return;
    grow(box, b[0] - pad, b[1] - pad);
    grow(box, b[2] + pad, b[3] + pad);
  };
  const strokePad = (g) => (g.lineWidth * scaleOf() / 2) * (g.lineJoin === 'miter' ? g.miterLimit : 1.5);
  const STATE = ['lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'font', 'textAlign', 'textBaseline', 'globalAlpha',
    'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'filter', 'lineDashOffset'];
  const size = (font) => { const r = /(\d+(?:\.\d+)?)px/.exec(font); return r ? +r[1] : 10; };

  const g = {
    lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, font: '10px sans-serif', textAlign: 'start',
    textBaseline: 'alphabetic', globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: '#000', strokeStyle: '#000',
    shadowBlur: 0, shadowColor: 'rgba(0,0,0,0)', shadowOffsetX: 0, shadowOffsetY: 0, filter: 'none', lineDashOffset: 0,
    imageSmoothingEnabled: true,
    save() { stack.push([m, dash, STATE.map((k) => g[k])]); },
    restore() {
      const s = stack.pop();
      if (!s) return;
      [m, dash] = s;
      STATE.forEach((k, i) => { g[k] = s[2][i]; });
    },
    translate(x, y) { mul(1, 0, 0, 1, x, y); },
    scale(x, y) { mul(x, 0, 0, y, 0, 0); },
    rotate(a) { const c = Math.cos(a), s = Math.sin(a); mul(c, s, -s, c, 0, 0); },
    transform(a, b, c, d, e, f) { mul(a, b, c, d, e, f); },
    setTransform(a, b, c, d, e, f) {
      if (typeof a === 'object') m = [a.a, a.b, a.c, a.d, a.e, a.f];
      else m = [a, b, c, d, e, f];
    },
    resetTransform() { m = [1, 0, 0, 1, 0, 0]; },
    getTransform() { return new DOMMatrix(m); },
    beginPath() { path = [Infinity, Infinity, -Infinity, -Infinity]; },
    closePath() {},
    moveTo: pt,
    lineTo: pt,
    quadraticCurveTo(cx, cy, x, y) { pt(cx, cy); pt(x, y); },
    bezierCurveTo(ax, ay, bx, by, x, y) { pt(ax, ay); pt(bx, by); pt(x, y); },
    arcTo(x1, y1, x2, y2) { pt(x1, y1); pt(x2, y2); },
    rect(x, y, w, h) { quad(path, x, y, x + w, y + h); },
    roundRect(x, y, w, h) { quad(path, x, y, x + w, y + h); },
    arc(x, y, r) { quad(path, x - r, y - r, x + r, y + r); },
    ellipse(x, y, rx, ry, rot) {
      // The box around the turned ellipse, in its own units, then into ours.
      const c = Math.cos(rot), s = Math.sin(rot);
      const hw = Math.hypot(rx * c, ry * s), hh = Math.hypot(rx * s, ry * c);
      quad(path, x - hw, y - hh, x + hw, y + hh);
    },
    fill(p) { if (p && typeof p === 'object') no('Path2D'); plain(g); ink(path); },
    stroke(p) { if (p) no('Path2D'); plain(g); ink(path, strokePad(g)); },
    clip() {}, // clipping only ever takes ink away
    fillRect(x, y, w, h) { plain(g); const b = [Infinity, Infinity, -Infinity, -Infinity]; quad(b, x, y, x + w, y + h); ink(b); },
    strokeRect(x, y, w, h) { plain(g); const b = [Infinity, Infinity, -Infinity, -Infinity]; quad(b, x, y, x + w, y + h); ink(b, strokePad(g)); },
    clearRect() {},
    fillText(text, x, y) { g._text(text, x, y, 0); },
    strokeText(text, x, y) { g._text(text, x, y, strokePad(g)); },
    _text(text, x, y, pad) {
      plain(g);
      const mm = measure();
      mm.font = g.font;
      const w = mm.measureText(String(text)).width, h = size(g.font);
      const a = g.textAlign;
      const x0 = a === 'center' ? x - w / 2 : a === 'right' || a === 'end' ? x - w : x;
      const b = [Infinity, Infinity, -Infinity, -Infinity];
      quad(b, x0 - h * 0.2, y - h * 1.3, x0 + w + h * 0.2, y + h * 1.3);
      ink(b, pad);
    },
    measureText(text) { const mm = measure(); mm.font = g.font; return mm.measureText(text); },
    drawImage(img, ...a) {
      plain(g);
      const b = [Infinity, Infinity, -Infinity, -Infinity];
      if (a.length === 2) quad(b, a[0], a[1], a[0] + img.width, a[1] + img.height);
      else if (a.length === 4) quad(b, a[0], a[1], a[0] + a[2], a[1] + a[3]);
      else quad(b, a[4], a[5], a[4] + a[6], a[5] + a[7]);
      ink(b);
    },
    setLineDash(d) { dash = d; },
    getLineDash() { return dash; },
    createPattern: (...a) => measure().createPattern(...a),
    createLinearGradient: (...a) => measure().createLinearGradient(...a),
    createRadialGradient: (...a) => measure().createRadialGradient(...a),
    // The box so far, [x0, y0, x1, y1], or null if nothing was drawn.
    get box() { return box[0] <= box[2] ? box.slice() : null; },
  };
  return g;
}
