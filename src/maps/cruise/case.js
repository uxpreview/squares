// The case file: who is patient zero? Everyone who looks green, what points
// at them, what clears them, what they say when you accuse them, and who it
// really was (a stowaway iguana). The format is src/game/case.js; the story
// is docs/levels/cruise.md, "The story". Every find it names is evidence;
// the rest of the ship's finds are curiosities.
//
// Lines are [who, what they say]; who is a cast id (style.js).
import { C, Q, mix, alpha, setScreen, dots, shade, person } from '../../engine/art.js';
import { INK, CAST, iguana, queasy } from './style.js';

// What the case file tells the art: whether it's solved (the reveal at the
// pool draws the iguana under a towel from then on).
export const verdict = { solved: null };

const suspects = [
  {
    id: 'doreen',
    name: 'Doreen',
    role: 'First in line since 1987',
    motive: 'She was in the buffet at 7:00 sharp, and she touches everything.',
    against: [{ find: 'buffet:tongs', says: 'Her tongs, a scrunchie on the handle. Used on every tray.' }],
    alibi: [{ find: 'buffet:queue-ticket', says: 'Her queue ticket: number 2. Someone was in the buffet before her.' }],
    scene: [
      ['pidge', 'Doreen. First through the doors, and your tongs on every tray.'],
      ['doreen', 'Second. I was number 2. Look at my ticket.'],
      ['pidge', 'Nobody beats you to a buffet.'],
      ['doreen', "Somebody did. There were bites out of the melon when I got there, and I don't bite melon."],
    ],
    cleared: 'Number 2 in the queue. It still hurts.',
  },
  {
    id: 'chad',
    name: 'Chad',
    role: 'On spring break in October',
    motive: 'Carried back to his cabin at 11am, green.',
    against: [{ find: 'cabins:chad-bucket', says: 'A bucket outside cabin 12, with his name on it.' }],
    alibi: [{ find: 'pool:bar-tab', says: 'His bar tab: 31 Green Mermaids since breakfast. He has not eaten since Tuesday.' }],
    scene: [
      ['pidge', 'Chad. Carried to your cabin at 11am. Green.'],
      ['chad', "Dude. Green Mermaids. They're green. It's in the name."],
      ['pidge', 'And the buffet?'],
      ['chad', "What's a buffet?"],
    ],
    cleared: 'Green from the cocktails, not the eggs. Never been near a vegetable.',
  },
  {
    id: 'gloria',
    name: 'Gloria',
    role: 'Lives at the spa',
    motive: 'Green in the face since dawn, and in the buffet for the eggs.',
    against: [{ says: 'Green in the face since dawn, and seen at the buffet at 7:10.' }],
    alibi: [{ find: 'adults-only:spa-card', says: 'Her spa card: cucumber mask, 6 to 11am. The green comes off.' }],
    scene: [
      ['pidge', 'Madam. You were green before anyone.'],
      ['gloria', 'It was a cucumber mask, Inspector. Forty dollars.'],
      ['pidge', 'And yet you went to breakfast in it.'],
      ['gloria', "The eggs don't wait. I wiped it off at eleven. Look at me. Pink."],
    ],
    cleared: 'A cucumber mask, 6 to 11am. She wants a refund.',
  },
  {
    id: 'captain',
    name: 'Captain Stubbs',
    role: 'Master of the ship',
    motive: "Green, and he hasn't left the bridge in four days.",
    against: [{ find: 'bridge:captain-bucket', says: 'A bucket by the ship\'s wheel.' }],
    alibi: [{ find: 'bridge:patches', says: 'A box of 500 seasickness patches. He has been green since 1996.' }],
    scene: [
      ['pidge', 'Captain. A bucket, by the wheel.'],
      ['captain', "I get seasick, Inspector. I've always got seasick."],
      ['pidge', 'You chose a career at sea.'],
      ['captain', 'My mother wanted a captain in the family. Please stop talking about boats.'],
    ],
    cleared: 'Seasick since 1996. Eats crackers on the bridge. Never the buffet.',
  },
  {
    id: 'chef',
    name: 'Chef Gaston',
    role: 'The buffet\'s chef',
    motive: 'His shrimp tower, out since Tuesday.',
    against: [{ find: 'buffet:shrimp', says: 'A shrimp from the top of the tower, on a toothpick flag.' }],
    alibi: [{ find: 'crew-bar:plastic-shrimp', says: 'A box of plastic display shrimp. The tower is fake. It has been out since 2009.' }],
    scene: [
      ['pidge', 'Chef. Your shrimp tower. Four days in the sun.'],
      ['chef', 'Fourteen years. It is plastic, monsieur. For display.'],
      ['pidge', 'People have been eating it.'],
      ['chef', 'One man. He came back for more. I respect him.'],
    ],
    cleared: 'The shrimp tower is plastic. One man ate two anyway.',
  },
  {
    id: 'tyler',
    name: 'Tyler',
    role: 'Eight. Loose',
    motive: 'Green hands, and he has been on every deck.',
    against: [{ find: 'casino:handprints', says: 'Sticky green handprints on a slot machine.' }],
    alibi: [{ find: 'theater:slime-kit', says: 'The kids\' show slime kit, lime, made at 10am. His hands are just slime.' }],
    scene: [
      ['pidge', 'Young man. Green hands. Every deck.'],
      ['tyler', "It's slime. We made it at the show. Want some?"],
      ['pidge', 'Absolutely not.'],
      ['tyler', "Grandma says you're not a real detective."],
    ],
    cleared: 'Slime from the kids\' show. It is on the ceiling now too.',
  },
  {
    id: 'iguana',
    name: 'The iguana',
    role: 'A stowaway from the last port',
    motive: 'It came aboard hungry, and the buffet opens at seven.',
    hidden: { name: 'Someone else?', role: 'Not on the manifest' },
    against: [
      { find: 'buffet:butter-prints', says: 'Claw prints through the butter swan, and a tail mark.' },
      { find: 'cabins:garland', says: 'A flower garland from the last port, nibbled.' },
      { find: 'waterslide:shed-skin', says: 'A patch of shed skin, green, up by the waterslide.' },
      { find: 'casino:clicker', says: 'The gangway clicker: 2,401 aboard. The manifest says 2,400.' },
      { find: 'sick-bay:lab-slip', says: 'The lab slip: salmonella. The reptile kind.' },
      { find: 'bridge:camera-still', says: 'A camera still from 6:52am: something green in the salad bar.' },
    ],
    alibi: [],
  },
];

export default {
  title: 'Who is patient zero?',
  intro: 'Something from the buffet is going round the ship, deck by deck. We dock at six and nobody gets off. Find where it started, then name patient zero.',
  ink: INK.funnelRed,
  culprit: 'iguana',
  suspects,
  names: { ...Object.fromEntries(Object.entries(CAST).map(([id, c]) => [id, c.name])), iguana: 'The iguana' },

  notYet: (have, need) => [
    ['pidge', "Someone else? It's not on the manifest. I can't arrest a blank line."],
    ['pidge', have ? `Find me the rest. You've got ${have} of ${need}.` : `Find me some evidence first. There are ${need} clues on this ship.`],
  ],

  // Naming it: the camera goes to the pool, where the iguana is on a sun
  // lounger with a Green Mermaid, and the clock goes to the afternoon.
  reveal: {
    lines: [
      ['pidge', 'An iguana? On a cruise ship? Preposterous.'],
      ['pidge', 'Although. 2,401 aboard. Claw prints in the butter. Something green in the salad bar at 6:52.'],
      ['pidge', 'It came up the gangway at the last port, ate the flowers, then the buffet.'],
      ['pidge', 'And reptiles carry salmonella. Doctor, the slip.'],
      ['swabb', 'The reptile kind. I did say.'],
      ['pidge', 'Somebody put a towel on that lizard!'],
    ],
    zone: 'pool',
    at: 105,
    text: 'Patient zero was a stowaway iguana from the last port. It is on a sun lounger with a Green Mermaid, and it is not getting off either.',
  },

  onSolved(at) { verdict.solved = at; },
  onOpen() { verdict.solved = null; },

  // A portrait: anyone in the case, in a porthole, on their own ink.
  portrait(ctx, id, w, h, t = 0, dpr = 1) {
    const cast = CAST[id];
    const ground = id === 'iguana' || id === 'someone' ? mix(INK.sea, C.white, 0.45) : mix(cast.color, C.white, 0.55);
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
    if (id === 'someone') {
      ctx.beginPath();
      ctx.ellipse(cx, cy - h * 0.1, w * 0.15, h * 0.16, 0, 0, Math.PI * 2);
      ctx.moveTo(cx - w * 0.4, cy + h * 0.5);
      ctx.bezierCurveTo(cx - w * 0.38, cy + h * 0.12, cx - w * 0.2, cy + h * 0.08, cx, cy + h * 0.08);
      ctx.bezierCurveTo(cx + w * 0.2, cy + h * 0.08, cx + w * 0.38, cy + h * 0.12, cx + w * 0.4, cy + h * 0.5);
      ctx.closePath();
      ctx.fillStyle = shade(INK.sea, 0.5);
      ctx.fill();
      ctx.font = `400 ${Math.round(h * 0.22)}px "Bagel Fat One", "Arial Black", sans-serif`;
      ctx.fillStyle = C.white;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy - h * 0.09);
    } else if (id === 'iguana') {
      const g = h * 0.5;
      ctx.translate(cx + g * 0.1, cy + g * 0.35);
      ctx.scale(g, g);
      iguana(ctx, 0, 0, 0, 'r', t);
    } else {
      ctx.translate(cx - k * 0.05, cy + k * 1.78);
      ctx.scale(k, k);
      const look = { ...cast.look, scale: 1 };
      if (id === 'captain') look.skin = queasy(look.skin, 0.85);
      if (id === 'gloria') look.skin = queasy(look.skin, 1);
      person(ctx, 0, 0, 0, { ...look, pose: 'stand', dir: 'r' }, t);
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
