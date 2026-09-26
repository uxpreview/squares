// The block's layout: a GRID x GRID square of rooms, PITCH units apart.
import { S } from '../../engine/iso.js';

export const GRID = 4;       // rooms per side
export const GAP = 5;        // space between rooms
export const PITCH = S + GAP;
export const EXTENT = (GRID - 1) * PITCH + S; // the whole block, corner to corner
