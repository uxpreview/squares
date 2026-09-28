// Where everything sits at the Crossroads, in world units. Four rooms round a
// cross of street, and an L of pavement along the two front edges. The street
// and the pavement are single areas of any shape (see "Chunks" in
// src/engine/zone.js): each is drawn in pieces, sorted in with the rooms.
import { S } from '../../engine/iso.js';

export const ROAD = 6; // the street's width
export const PAVE = 5; // the pavement's width
export const EDGE = S * 2 + ROAD; // the far side of the rooms, 38

// Rooms, by their back corner.
export const ROOMS = {
  north: [0, 0],
  east: [S + ROAD, 0],
  west: [0, S + ROAD],
  south: [S + ROAD, S + ROAD],
};

// The street, a cross: its arm along y is cut where the arm along x crosses.
export const STREET = [
  [S, 0, S + ROAD, S], // north arm
  [0, S, EDGE, S + ROAD], // along x, the whole way
  [S, S + ROAD, S + ROAD, EDGE], // south arm
];

// The pavement, an L round the front.
export const PAVEMENT = [
  [EDGE, 0, EDGE + PAVE, EDGE + PAVE], // down the right-hand front
  [0, EDGE, EDGE, EDGE + PAVE], // along the left-hand front
];

// The middle of the road, both ways.
export const MID = S + ROAD / 2; // 19
