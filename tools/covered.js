// Two of the pinched-in tour's most common finds, as a machine check (run in
// the page; QA calls it, and so does `node tools/covered.mjs <level>`):
//
//   people   someone drawn inside a solid thing: their head is painted over
//            by something drawn after them (a counter, a car, a bunk)
//   finds    a find painted over by its own furniture: whatever draws the find
//            shows nothing at its spot, yet drawn again on top it would
//
// The test is the same for both. Draw the area; draw the person (or the thing
// at the find's spot) again on top; if that changes what's at their head (or
// the find's spot) a lot, something was drawn over it. The thing that draws a
// find is the standing thing nearest its spot; one it can't tell is skipped.
//
// Each area is drawn as a player sees it from inside: walls up, its outside
// gone, every lid shut (a find inside a poke is hidden on purpose and skipped).
//
// o: { moments: [t...] } Returns { people: [...], finds: [...], counted }.
export async function coveredInPage(o) {
  const A = await import('/src/engine/art.js');
  const Z = await import('/src/engine/zone.js');
  const { ZK } = await import('/src/engine/iso.js');
  const { footprint } = await import('/src/engine/footprint.js');
  const w = window.__squares.world;
  const K = 16; // pixels a unit
  const THING = 4; // (zone.js's layer for standing things)
  const out = { people: [], finds: [], counted: { people: 0, finds: 0 } };
  let draws = new Map();
  const src = (it) => (draws.get(it) || it.draw).toString().replace(/\s+/g, ' ').slice(0, 90);

  for (const z of w.zones) {
    const b = z.bounds;
    const W = Math.ceil((b.x1 - b.x0) * K), H = Math.ceil((b.y1 - b.y0) * K);
    if (W * H > 3e7) continue;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const keep = { wallK: z.wallK, shellK: z.shellK };
    z.wallK = 1; z.shellK = 0;
    // Which item is drawing (so a head can be traced to whoever drew it).
    let cur = null;
    draws = new Map();
    for (const it of z.items) {
      const d = it.draw;
      draws.set(it, d);
      it.draw = (ctx, t) => { const p = cur; cur = it; try { d(ctx, t); } finally { cur = p; } };
    }
    const toPx = () => { g.setTransform(K, 0, 0, K, -b.x0 * K, -b.y0 * K); A.setScreen(K, 1); A.Q.detail = true; A.Q.lines = true; };
    // skip: items left out (a list).
    const paint = (t, skip = []) => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      toPx();
      const off = skip.map((it) => it.draw);
      for (const it of skip) it.draw = () => {};
      try { Z.drawZoneVector(g, z, t); } finally { skip.forEach((it, i) => { it.draw = off[i]; }); }
    };
    // Whether an item is drawn at all at t (some come and go).
    const on = (it, t) => !(it.on && !it.on(t)) && !(it.fade && !(it.fade(t) > 0.002));
    // Draw one item again, on top of what's there.
    const again = (it, t) => {
      toPx();
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      const p = cur; cur = null;
      try { draws.get(it)(g, t); } finally { cur = p; }
      g.restore();
    };
    // The share of a circle's pixels that differ between two pictures.
    const circle = (cx, cy, r) => {
      const x0 = Math.max(0, Math.floor(cx - r)), y0 = Math.max(0, Math.floor(cy - r));
      const x1 = Math.min(W, Math.ceil(cx + r)), y1 = Math.min(H, Math.ceil(cy + r));
      return x1 > x0 && y1 > y0 ? { x0, y0, w: x1 - x0, h: y1 - y0, cx, cy, r } : null;
    };
    const read = (c) => g.getImageData(c.x0, c.y0, c.w, c.h).data;
    // (o.shots: a close-up of what was flagged, as it's drawn and with the
    // thing drawn again on top, for a person to look at.)
    const shot = (c) => {
      if (!o.shots) return null;
      const R = Math.max(c.r * 5, 40), sc = document.createElement('canvas');
      sc.width = sc.height = Math.round(R * 2);
      sc.getContext('2d').drawImage(cv, c.cx - R, c.cy - R, R * 2, R * 2, 0, 0, R * 2, R * 2);
      return sc.toDataURL();
    };
    const differ = (c, a, d) => {
      let n = 0, on = 0;
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
        if (Math.hypot(c.x0 + x + 0.5 - c.cx, c.y0 + y + 0.5 - c.cy) > c.r) continue;
        n++;
        const i = (y * c.w + x) * 4;
        if (Math.abs(a[i] - d[i]) + Math.abs(a[i + 1] - d[i + 1]) + Math.abs(a[i + 2] - d[i + 2]) + Math.abs(a[i + 3] - d[i + 3]) > 60) on++;
      }
      return n ? on / n : 0;
    };

    try {
      const seenPeople = new Set(), seenFinds = new Set();
      for (const t of o.moments) {
        // ---- People: whose head is painted over ----
        const heads = [];
        A.watch.person = (ctx, x, y, r) => {
          if (!cur) return;
          const m = ctx.getTransform();
          heads.push({ it: cur, cx: m.a * x + m.c * y + m.e, cy: m.b * x + m.d * y + m.f, r: r * Math.hypot(m.a, m.b) * 0.8 });
        };
        paint(t);
        A.watch.person = null;
        const base = g.getImageData(0, 0, W, H);
        // What's in front of a head, leaving out other people (someone behind
        // someone is fine) and what's laid over the whole room (the night,
        // the glow of a lamp, a building's outside).
        const people = [...new Set(heads.map((h) => h.it))];
        const over = z.items.filter((it) => it.layer > THING);
        let lastIt = null, alone = null;
        for (const h of heads) {
          if (h.r < 2 || !on(h.it, t)) continue;
          if (h.it !== lastIt) {
            lastIt = h.it;
            paint(t, [...people.filter((it) => it !== h.it), ...over]);
            alone = g.getImageData(0, 0, W, H);
          }
          g.putImageData(alone, 0, 0);
          const c = circle(h.cx, h.cy, h.r);
          if (!c) continue;
          out.counted.people++;
          const a = read(c);
          const before = shot(c);
          again(h.it, t);
          const k = differ(c, a, read(c));
          const key = src(h.it) + Math.round(h.cx / 8) + ',' + Math.round(h.cy / 8);
          if (k > 0.35 && !seenPeople.has(key)) {
            seenPeople.add(key);
            out.people.push({ zone: z.name, t, share: k, what: src(h.it), shots: o.shots ? [before, shot(c)] : null });
          }
        }
        g.putImageData(base, 0, 0);

        // ---- Finds: painted over by their own furniture ----
        let boxes = null;
        for (const f of z.finds) {
          if (f.goose || f.inside || seenFinds.has(f.id)) continue;
          if (f.when && !f.when(t)) continue;
          const [x, y, hz] = typeof f.at === 'function' ? f.at(t) : f.at;
          const X = x - y, Y = (x + y) / 2 - (hz || 0) * ZK;
          // What draws the find: of the standing things with ink at its spot,
          // the smallest (the table it's on is bigger).
          if (!boxes) {
            boxes = new Map();
            A.Q.detail = A.Q.lines = true;
            for (const it of z.items) {
              if (it.layer !== THING || !on(it, t)) continue;
              try {
                const fp = footprint();
                fp.lineCap = 'round'; fp.lineJoin = 'round';
                draws.get(it)(fp, t);
                if (fp.box) boxes.set(it, fp.box);
              } catch { /* can't be measured: not a candidate */ }
            }
          }
          let best = null, area = Infinity;
          for (const [it, bx] of boxes) {
            if (X < bx[0] || X > bx[2] || Y < bx[1] || Y > bx[3]) continue;
            const a = (bx[2] - bx[0]) * (bx[3] - bx[1]);
            if (a < area) { area = a; best = it; }
          }
          if (!best) continue;
          const c = circle((X - b.x0) * K, (Y - b.y0) * K, Math.min(f.r, 0.5) * K);
          if (!c) continue;
          out.counted.finds++;
          const a = read(c);
          paint(t, [best]);
          const shows = differ(c, a, read(c)); // how much it shows now
          g.putImageData(base, 0, 0);
          const before = shot(c);
          again(best, t);
          const over = differ(c, a, read(c)); // how much more it would show on top
          if (shows < 0.04 && over > 0.15) {
            seenFinds.add(f.id);
            out.finds.push({ zone: z.name, id: f.id, label: f.label, t, over, what: src(best), shots: o.shots ? [before, shot(c)] : null });
          }
          g.putImageData(base, 0, 0);
        }
      }
    } finally {
      A.watch.person = null;
      for (const [it, d] of draws) it.draw = d;
      z.wallK = keep.wallK; z.shellK = keep.shellK;
    }
  }
  return out;
}
