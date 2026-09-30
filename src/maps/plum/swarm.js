// The greenhead man's day, on its own so every area can read it: at ten a
// swarm of greenheads finds him in the Center's lot and follows him all day,
// across the lot, down the Town Beach and back, through the Center, past the
// refuge's line and out along the Lot 1 boardwalk, where he stops with
// everyone for the sunset. Then it's too dark for the flies, and he goes
// home. day.js draws him; anyone standing near his way steps aside as he
// passes (aside(), below), so the swarm reads from one area to the next.
import { schedule } from '../../engine/actors.js';
import { h } from './land.js';
import { LOOP, at } from './tide.js';

const WALK = 1.3, NORTH = 30.5; // the island road's northbound lane (BLVD - 0.5)
const GATE = 46.4;
export const GH = [at(10), at(21.5)];
const steps = [
  [58.2, 36.4], { until: GH[0], pose: 'stand' },
  { wait: 3, pose: 'point', say: 'What was that?' },
  { speed: 2.4 }, [62, 37.6], [62, 43.4], [70, 45], [92, 45.2], { wait: 3, pose: 'wave' },
  [72, 45.6], [63, 44.4], [62, 38], [61.6, NORTH - 1.2], [GATE + 1, NORTH - 1.2], { wait: 2, pose: 'wave' },
  [44, NORTH - 1.2], [42.4, 34.4], { speed: WALK }, [40, 36.4], [40, 43.6], [40.6, 46], { until: at(19.8), pose: 'wave' },
  { until: at(20.9), pose: 'stand', dir: 'l', back: true },
  [40, 43.6], [40, 36.4], [42, 34.4], { until: GH[1] + 1 },
  [58.2, 36.4],
];
export const ghWalk = schedule(steps, { loop: LOOP, name: 'The greenhead man', speed: WALK });
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
export const swarmOut = (t) => { const s = wrap(t); return s >= GH[0] && s < GH[1]; };
// Where he (and his swarm) is at t, or null when he's in his car.
export function swarmAt(t) {
  if (!swarmOut(t)) return null;
  const p = ghWalk(t);
  return { ...p, z: h(p.x, p.y) };
}

// Someone standing at (x, y) steps aside as the man and his swarm come past:
// { dx, dy } to add to where they stand (up to about a unit and a half, away
// from him, eased in and out as he nears and goes), and k, 0 to 1, how close
// he is (above 0.5, they're swatting: a good moment for 'wave'). r: how near
// he has to come before they move.
export function aside(x, y, t, r = 3) {
  const p = swarmAt(t);
  if (!p) return { dx: 0, dy: 0, k: 0 };
  const ex = x - p.x, ey = y - p.y, d = Math.hypot(ex, ey);
  if (d >= r) return { dx: 0, dy: 0, k: 0 };
  const k = 1 - d / r, e = k * k * (3 - 2 * k), push = 1.5 * e;
  const ux = d > 0.01 ? ex / d : 1, uy = d > 0.01 ? ey / d : 0;
  return { dx: ux * push, dy: uy * push, k: e };
}
