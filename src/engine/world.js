// A world is a map, built: its zones placed in 3D, in draw order, with the
// questions the camera and the game need answered ("what's the whole picture",
// "where does this zone sit on screen", "which zone did I tap").
//
// A map module (see src/maps/*/map.js) exports:
//   {
//     id, name, tagline,
//     zones: [{ zone, at: [x, y, z], tag }],  // zone modules and where they go
//     order: ['zoneId', ...],                   // prev/next and list order (optional)
//     cutaway: { front: true, above: false },   // how zones get out of the way (below)
//     overview(portrait) => [X0, X1, Y0, Y1],   // the framing for the whole map (optional)
//     backdrop(ctx, t, world), sky(ctx, t, world, fx),  // drawn under / over the zones (optional)
//     words: { ... },                           // map-specific copy (see src/game/play.js)
//   }
//
// Cutaways, for when you're looking at one zone:
//   front: zones in front of it are cut away around its outline (the block)
//   above: zones stacked above it lift up and fade out (a building's floors)

import { buildZone } from './zone.js';
import { ZK, SLAB, unproject } from './iso.js';

export function buildWorld(map) {
  const zones = map.zones.map((place, index) => Object.assign(buildZone(place.zone, place), { index }));
  // Back to front: along the floor first, then upward.
  const drawOrder = zones.slice().sort((a, b) => a.ox + a.oy - (b.ox + b.oy) || a.oz - b.oz || a.ox - b.ox);
  const order = map.order
    ? map.order.map((id) => zones.findIndex((z) => z.id === id)).filter((i) => i >= 0)
    : drawOrder.map((z) => z.index);

  const totalGeese = zones.filter((z) => z.finds.some((f) => f.goose)).length;
  const totalThings = zones.reduce((n, z) => n + z.finds.filter((f) => !f.goose).length, 0);

  // The zone's body (floor, walls, slab) in world iso space.
  const body = (z) => {
    const [ax, ay] = z.anchor;
    return [ax - z.d, ax + z.w, ay - z.h * ZK, ay + (z.w + z.d) / 2 + SLAB * ZK];
  };

  function overviewBox(portrait) {
    if (map.overview) return map.overview(portrait);
    let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
    for (const z of zones) {
      const [a, b, c, d] = body(z);
      X0 = Math.min(X0, a); X1 = Math.max(X1, b); Y0 = Math.min(Y0, c); Y1 = Math.max(Y1, d);
    }
    const px = portrait ? 1.5 : 6;
    return [X0 - px, X1 + px, Y0 - 5, Y1 + 4];
  }

  function zoneBox(z) {
    const [X0, X1, Y0, Y1] = body(z);
    return [X0 - 0.5, X1 + 0.5, Y0 - 1.5, Y1 + 0.5];
  }

  // Which zone is at world iso point (X, Y)? Front-most wins. Tests the floor,
  // then a few heights so taps on walls and tall things count too. Zones lifted
  // by a cutaway are tested where they're drawn. skip(zone) leaves zones out.
  function zoneAt(X, Y, skip) {
    for (let i = drawOrder.length - 1; i >= 0; i--) {
      const z = drawOrder[i];
      if (skip && skip(z)) continue;
      const [ax, ay] = [z.anchor[0], z.anchor[1] - (z.lift || 0)];
      for (const h of [0, 2, 4, 6]) {
        const [lx, ly] = unproject(X - ax, Y - ay + h * ZK);
        if (lx < -0.5 || ly < -0.5 || lx > z.w || ly > z.d) continue;
        if (h > 0 && lx > 1.2 && ly > 1.2) continue; // above the floor only near the back walls
        return z.index;
      }
    }
    return -1;
  }

  return {
    map,
    id: map.id,
    zones,
    drawOrder,
    order,
    totalGeese,
    totalThings,
    cutaway: { front: false, above: false, ...(map.cutaway || { front: true }) },
    overviewBox,
    zoneBox,
    zoneAt,
    indexOf: (id) => zones.findIndex((z) => z.id === id),
  };
}
