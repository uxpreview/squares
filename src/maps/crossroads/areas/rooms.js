// The four rooms at the Crossroads: plain greybox shells, each with its
// front open (the cut-away side), a goose and a thing. The launderette's
// back is to the street, so it has a door.
import { C } from '../../../engine/art.js';
import { shell, block, pin } from '../../greybox.js';

function room(id, name, blurb, floor, props, finds, goose, doors = []) {
  return {
    id,
    name,
    blurb,
    build(R) {
      shell(R, { floor, walls: { left: C.white, right: C.greyLight, doors }, name });
      for (const p of props) block(R, ...p);
      R.goose(goose, { dir: 'l' });
      finds.forEach((f, i) => pin(R, f, i + 1));
    },
  };
}

export const north = room('north', 'Corner Shop', 'Open all hours. The till has been ringing on its own since Tuesday.', C.butter,
  [[2, 2, 6, 2, 2.4, C.teal, 'Shelves'], [10, 3, 3, 2, 1.2, C.coral, 'Till']],
  [{ id: 'receipt', label: 'A very long receipt', at: [11, 6, 0.1], r: 0.8 }], [5, 9]);

export const east = room('east', 'Barber', 'Every haircut here is the same haircut. Nobody has noticed.', C.blush,
  [[3, 2, 2, 2, 2, C.navy, 'Chair'], [8, 2, 2, 2, 2, C.navy, 'Chair']],
  [{ id: 'comb', label: 'A lost comb', at: [12, 9, 0.1], r: 0.8 }], [6, 11]);

export const west = room('west', 'Cafe', 'The coffee machine is louder than the band.', C.mint,
  [[3, 3, 2, 2, 1, C.wood, 'Table'], [9, 5, 2, 2, 1, C.wood, 'Table']],
  [{ id: 'spoon', label: 'A bent spoon', at: [7, 11, 0.1], r: 0.8 }], [11, 10]);

export const south = room('south', 'Launderette', 'Machine two is on its fourth rinse today.', C.greyLight,
  [[2, 2, 2, 2, 2.2, C.white, 'Washer'], [5, 2, 2, 2, 2.2, C.white, 'Washer'], [8, 2, 2, 2, 2.2, C.white, 'Washer']],
  [{ id: 'sock', label: 'An odd sock', at: [10, 10, 0.1], r: 0.8 }], [4, 11],
  [{ side: 'right', at: 5 }]); // a door onto the street behind it
