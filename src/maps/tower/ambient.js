// Around the Walk-Up: the pavement it stands on, dashed guide lines that tie
// the pulled-apart floors together (like an exploded diagram), print marks,
// pigeons, and clouds.
import { S, ZK, SLAB } from '../../engine/iso.js';
import { C, alpha, paint, shade, dots } from '../../engine/art.js';
import { P3, reg, birds, geeseV } from '../shared.js';
import { FLOOR, FLOORS } from './layout.js';

const TOP = (FLOORS - 1) * FLOOR;

function quad(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y, z], i) => {
    const [X, Y] = P3(x, y, z);
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  });
  ctx.closePath();
}

export function backdrop(ctx, t) {
  // The pavement: a wide paving slab the building sits on, with a kerb.
  const g = -SLAB, m = 5;
  quad(ctx, [[-m, -m, g], [S + m, -m, g], [S + m, S + m, g], [-m, S + m, g]]);
  paint(ctx, C.paperDeep, { dots: shade(C.paperDeep, 0.25), density: 0.12 });
  quad(ctx, [[S + m, -m, g], [S + m, S + m, g], [S + m, S + m, g - 0.6], [S + m, -m, g - 0.6]]);
  paint(ctx, shade(C.paperDeep, 0.15));
  quad(ctx, [[-m, S + m, g], [S + m, S + m, g], [S + m, S + m, g - 0.6], [-m, S + m, g - 0.6]]);
  paint(ctx, shade(C.paperDeep, 0.3));
  // paving joints
  ctx.beginPath();
  for (let i = -m + 3; i < S + m; i += 3) {
    let [a, b] = P3(i, -m, g), [c, d] = P3(i, S + m, g);
    ctx.moveTo(a, b); ctx.lineTo(c, d);
    [a, b] = P3(-m, i, g); [c, d] = P3(S + m, i, g);
    ctx.moveTo(a, b); ctx.lineTo(c, d);
  }
  ctx.strokeStyle = alpha(C.ink, 0.12);
  ctx.lineWidth = 0.05;
  ctx.stroke();

  // Exploded-view guides: dashed lines up each outside corner, floor to floor.
  ctx.save();
  ctx.setLineDash([0.5, 0.45]);
  ctx.strokeStyle = alpha(C.ink, 0.45);
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  for (let f = 0; f < FLOORS - 1; f++) {
    const z0 = f * FLOOR, z1 = (f + 1) * FLOOR - SLAB;
    for (const [x, y] of [[S, 0], [S, S], [0, S], [-0.45, -0.45]]) {
      const [a, b] = P3(x, y, z0 + (x === -0.45 ? 6 : 0));
      const [c, d] = P3(x, y, z1);
      ctx.moveTo(a, b); ctx.lineTo(c, d);
    }
  }
  ctx.stroke();
  ctx.restore();

  // Print marks and a caption, like the block's sheet.
  const top = -TOP * ZK - 6 * ZK - 5;
  // Centered under the pavement so it fits a narrow phone too.
  reg(ctx, 0, top);
  reg(ctx, 0, S + 12.5);
  reg(ctx, -S - 12, (top + S) / 2);
  reg(ctx, S + 12, (top + S) / 2);
  const k = 40;
  ctx.save();
  ctx.translate(0, S + 9.2);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = alpha(C.ink, 0.55);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('THE WALK-UP  ·  EXPLODED VIEW  ·  4 FLOORS, NO LIFT', 0, 0);
  ctx.restore();
}

// Slow flat clouds with a halftone underside.
function cloud(ctx, t, i) {
  const period = 140 + i * 30;
  const k = (((t + i * 57) % period) + period) % period / period;
  const X = -40 + k * 80, Y = -TOP * ZK - 12 + i * 9;
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.2, 1.1, 0, 0, Math.PI * 2);
  ctx.ellipse(-1.8, -0.6, 2, 1, 0, 0, Math.PI * 2);
  ctx.ellipse(1.6, -0.8, 2.3, 1.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.fillStyle = dots(C.sky, 0.25);
  ctx.fill();
  ctx.restore();
}

export function sky(ctx, t, world, fx) {
  cloud(ctx, t, 0);
  cloud(ctx, t, 1);
  birds(ctx, t, 0, S * 2, TOP + 14);
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, S * 2, TOP + 12);
}
