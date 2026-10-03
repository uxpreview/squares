// The chase: the iguana is loose. Patient zero came aboard at the last port
// and has been going round the ship all day, one step ahead of everyone. You
// follow it: eight sightings, in order through the day (their hours are
// CHASE in style.js), each pointed to by a witness who saw it go. The last
// corners it at the gangway as the ship docks. The format is
// src/game/trail.js; the story is docs/levels/cruise.md, "The chase".
//
// Lines are what a witness says; who is a cast id (style.js).
import { C, Q, mix, alpha, setScreen, dots, shade, person } from '../../engine/art.js';
import { INK, CAST, iguana, dressed, at, chase } from './style.js';

// Each sighting: the find it is (every area's is "iguana", from kit.js's
// sighting()), the witness who points to it, and what the log says once
// it's been seen.
const sightings = [
  { find: 'buffet:iguana', who: 'pidge', says: 'The camera saw it in the salad bar at 6:52.', seen: 'In the salad bar at breakfast, under the lettuce.' },
  { find: 'cabins:iguana', who: 'doreen', says: 'It beat me to the melon, then took the lift up.', seen: 'Posing as a towel animal on the honeymoon bed, a flower in its mouth.' },
  { find: 'waterslide:iguana', who: 'steward', says: 'A towel animal walked off. Up to the sun deck.', seen: 'At the top of the waterslide, shedding its skin.' },
  { find: 'pool:iguana', who: 'tyler', says: 'It came down the slide and went to the big pool.', seen: 'At the limbo at noon. It won.' },
  { find: 'adults-only:iguana', who: 'kelly', says: 'Our limbo champion! Then it wanted somewhere quiet.', seen: 'At the spa, under a seaweed wrap, cucumbers on its eyes.' },
  { find: 'crew-bar:iguana', who: 'gloria', says: 'It took my cucumbers and went to a party below.', seen: 'At the crew party, where nobody is green but it.' },
  { find: 'engine-room:iguana', who: 'chef', says: 'It ate my plastic shrimp. Now it needs a nap.', seen: 'Asleep in the hammock, with the chief.' },
  { find: 'casino:iguana', who: 'captain', says: "It'll try the gangway. Nobody gets off.", seen: 'At the gangway as the ship docked. Cornered.' },
];

export default {
  title: 'Where is patient zero?',
  intro: 'Something from the buffet is going round the ship. Patient zero is a stowaway iguana, and it is loose. Follow it, sighting by sighting, before we dock.',
  ink: INK.funnelRed,
  quarry: 'The iguana',
  sightings,
  names: { pidge: 'Pidge', doreen: 'Doreen', steward: 'The steward', tyler: 'Tyler', kelly: 'Kelly', gloria: 'Gloria', chef: 'Chef Gaston', captain: 'The captain' },

  // Tell the art which sighting is next, and when each was found.
  onStep(step, found) {
    chase.step = step;
    chase.found = found;
  },

  // A portrait: a witness, in a porthole, on their own ink.
  portrait(ctx, id, w, h, t = 0, dpr = 1) {
    const cast = CAST[id];
    const ground = id === 'iguana' ? mix(INK.sea, C.white, 0.45) : mix(cast.color, C.white, 0.55);
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.44, edge = Math.min(w, h) * 0.06;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + edge, 0, Math.PI * 2);
    ctx.fillStyle = C.greyLight;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, edge * 0.35);
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    // Rivets round the porthole.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * (r + edge / 2), cy + Math.sin(a) * (r + edge / 2), edge * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = C.grey;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = ground;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const k = h * 0.5;
    setScreen(k * dpr, dpr);
    ctx.fillStyle = dots(shade(ground, 0.25), 0.18);
    ctx.fillRect(0, 0, w, h);
    const lines = Q.lines, detail = Q.detail;
    Q.lines = true;
    Q.detail = true;
    if (id === 'iguana') {
      const g = h * 0.5;
      ctx.translate(cx + g * 0.1, cy + g * 0.35);
      ctx.scale(g, g);
      iguana(ctx, 0, 0, 0, 'r', t, { shades: true });
    } else {
      ctx.translate(cx - k * 0.05, cy + k * 1.78);
      ctx.scale(k, k);
      // In costume, at the hour they look most suspicious (Gloria in her
      // mask, Doreen green, Tyler slimed), whatever the clock says.
      const hour = { doreen: 12, chad: 10, gloria: 8, tyler: 12, brenda: 12, swabb: 17, pidge: 17 }[id] ?? 8;
      const look = dressed(id, at(hour), { pose: 'stand', dir: 'r' });
      person(ctx, 0, 0, 0, { ...look, scale: 1 }, t);
    }
    Q.lines = lines;
    Q.detail = detail;
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.white, 0.12);
    ctx.fill();
    ctx.lineWidth = Math.max(1, edge * 0.3);
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.restore();
  },
};
