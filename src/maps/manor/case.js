// The case file: who might have killed Lord Gooseworth, what points at each of
// them, what clears them, what they say when you accuse them, and who really
// did it (the goose). The format is src/game/case.js; this is the Manor's story
// (docs/levels/manor.md, "The story"). Every find it names is evidence; the rest
// of the Manor's finds are curiosities.
//
// Lines are [who, what they say]; who is a cast id (style.js), or 'goose'.
import { C, Q, mix, shade, alpha, setScreen, dots, person } from '../../engine/art.js';
import { INK, MAT, CAST, dressed, monocleGoose, verdict } from './style.js';

const suspects = [
  {
    id: 'philippa',
    name: 'Lady Philippa',
    role: 'The much younger wife',
    motive: 'The inheritance.',
    against: [{ find: 'library:lipstick-glass', says: 'Her lipstick, on a wine glass right by the body.' }],
    alibi: [{ find: 'conservatory:love-letters', says: 'Love letters in a flowerpot. She was in the conservatory all night, with the gardener.' }],
    scene: [
      ['pidge', 'Lady Philippa. Your lipstick was on a glass beside the body.'],
      ['philippa', 'I had one drink with my husband. Then I spent the night in the conservatory.'],
      ['pidge', 'Alone?'],
      ['philippa', 'With the gardener. We were pruning.'],
      ['pidge', 'At midnight?'],
      ['philippa', "The roses won't prune themselves, Inspector."],
    ],
    cleared: 'In the conservatory all night. The ferns saw everything.',
  },
  {
    id: 'rupert',
    name: 'Rupert',
    role: 'The son and heir',
    motive: 'Gambling debts.',
    against: [{ find: 'guest-rooms:silver', says: 'The family silver, packed in a suitcase upstairs.' }],
    alibi: [{ find: 'billiard-room:pawn-ticket', says: 'A pawn ticket dated tomorrow. He was selling the silver, not killing for it.' }],
    scene: [
      ['pidge', 'Rupert. The family silver, in a suitcase, with your socks.'],
      ['rupert', "I'm pawning it tomorrow. It's on the ticket."],
      ['pidge', 'And at midnight?'],
      ['rupert', 'Losing to the chauffeur. I bet my car. Then my shoes.'],
      ['pidge', 'And then?'],
      ['rupert', "The house. He's very good at cards."],
    ],
    cleared: 'Losing the house at cards all night. The chauffeur will confirm it, smugly.',
  },
  {
    id: 'crane',
    name: 'Dr. Crane',
    role: 'The family doctor',
    motive: "He's in the new will.",
    against: [
      { find: 'guest-rooms:doctors-bag', says: "An empty bottle of the Lord's heart pills, in his bag." },
      { find: 'master-bedroom:new-will', says: 'The new will leaves him the good armchair.' },
    ],
    alibi: [{ find: 'guest-rooms:mint-tin', says: 'His tin of mints, empty. The "pills" by the body are his mints: someone swapped them.' }],
    scene: [
      ['pidge', "Doctor. His heart pills, empty, in your bag. And you're in the new will."],
      ['crane', "I'm his doctor. I carry his pills. And I'd have got the armchair anyway."],
      ['pidge', "Then what's in the bottle by the body?"],
      ['crane', 'Mints. My mints. Someone took them from my bag and swapped them in.'],
      ['pidge', "Who steals a doctor's mints?"],
      ['crane', 'Someone who bites through lids, apparently.'],
    ],
    cleared: 'The pills by the body are his mints. Someone swapped them, and it wasn\'t him.',
  },
  {
    id: 'hatchett',
    name: 'Mrs. Hatchett',
    role: 'The cook, forty years',
    motive: 'Forty years of insults about her trifle.',
    against: [{ find: 'grand-hall:rolling-pin', says: 'Her rolling pin, lying in the hall.' }],
    alibi: [{ find: 'kitchen:timer', says: 'Her kitchen timer, set for midnight. She was baking the second trifle.' }],
    scene: [
      ['pidge', 'Mrs. Hatchett. Your rolling pin, in the hall. And forty years of insults about your trifle.'],
      ['hatchett', 'At midnight I was making a second trifle. The timer went off at twelve.'],
      ['pidge', 'Why make a second trifle?'],
      ['hatchett', 'Out of respect. The first one has his face in it.'],
    ],
    cleared: 'Baking at midnight, with a timer to prove it. The rolling pin just gets around.',
  },
  {
    id: 'brigadier',
    name: 'Brigadier Snort',
    role: 'An old friend',
    motive: 'A debt from 1974.',
    against: [{ find: 'guest-rooms:pistol', says: 'A duelling pistol, freshly cleaned.' }],
    alibi: [{ find: 'guest-rooms:pistol', says: 'A cork in its barrel. It hasn\'t been fired since 1974.' }],
    scene: [
      ['pidge', 'Brigadier. A duelling pistol, freshly cleaned. And he owed you money.'],
      ['brigadier', "Clean it every Sunday. Haven't fired it since 1974. Cork's still in."],
      ['pidge', "Why is there a cork in it?"],
      ['brigadier', 'Long story. It was 1974. We were outnumbered...'],
      ['pidge', 'Next!'],
    ],
    cleared: 'The cork has been in since 1974. So has the story.',
  },
  {
    id: 'jenkins',
    name: 'Jenkins',
    role: 'The butler',
    motive: 'Obviously.',
    against: [{ says: 'Caught packing a suitcase in the cellar. Also, he\'s the butler.' }],
    alibi: [{ find: 'cellar:resignation', says: 'His resignation letter, dated last week. He\'s leaving, not killing.' }],
    scene: [
      ['pidge', 'Jenkins. The butler. Packing a suitcase. Case closed.'],
      ['jenkins', "I resigned last week, sir. It's in my letter. I'm working my notice."],
      ['pidge', 'Then why were you in the cellar all night?'],
      ['jenkins', 'Drinking the 1974, sir. Nobody is paying me anyway.'],
    ],
    cleared: 'He resigned last week. He\'s leaving with the good wine, not a body.',
  },
  {
    id: 'goose',
    name: 'The goose',
    role: 'Loose, as usual',
    motive: 'It read the order form: one goose, stuffed, by Tuesday.',
    // Until the clues are in, nothing on the card says goose: the evidence has to.
    hidden: { name: 'Someone else?', role: 'Not on the guest list' },
    against: [
      { find: 'library:feathers', says: 'Goose feathers on the rug, by the body.' },
      { find: 'library:pill-bottle', says: 'Beak marks on the cap of his pill bottle.' },
      { find: 'kitchen:footprints', says: 'Webbed footprints in the kitchen flour.' },
      { find: 'taxidermy-room:order-form', says: 'An order form: one goose, stuffed, by Tuesday.' },
      { find: 'taxidermy-room:empty-stand', says: 'A new stand in the taxidermy room, marked GOOSE. Empty.' },
      { find: 'master-bedroom:diary', says: 'His diary: "the goose is looking at me again".' },
    ],
    alibi: [],
  },
];

export default {
  title: 'Who killed Lord Gooseworth?',
  intro: 'Face down in his birthday trifle at midnight. The storm has cut the road, so whoever did it is still here. Find the evidence, then accuse anyone you like.',
  ink: INK.oxblood,
  culprit: 'goose',
  suspects,
  // Who's who in the conversations.
  names: { ...Object.fromEntries(Object.entries(CAST).map(([id, c]) => [id, c.name])), goose: 'The goose' },

  // Naming the culprit before you've got the clues.
  notYet: (have, need) => [
    ['pidge', 'Someone else? Who? I can\'t arrest a question mark.'],
    ['pidge', have ? `Find me the rest of the clues. You've got ${have} of ${need}.` : `Find me some clues first. There are ${need} somewhere in this house.`],
  ],

  // Naming it right. Then the camera goes to the dining room, where the goose
  // has taken the Lord's chair (dining-room.js draws it once verdict.solved is
  // set), and the clock goes back to dinner so the whole table is there to see.
  reveal: {
    // The ending shows the goose in his monocle. It came in the parcel on the
    // front step, which not everyone has found, so Pidge mentions it either way.
    lines: (isFound) => [
      ['pidge', "The goose? Preposterous. It's a goose."],
      ['pidge', 'Although. Feathers by the body. Beak marks on the pills. Webbed feet in the flour.'],
      ['pidge', 'An order for one goose, stuffed, by Tuesday. An empty stand with its name on it.'],
      ['pidge', 'He was going to stuff it. So it swapped his heart pills for the doctor\'s mints, and waited.'],
      ['goose', 'HONK.'],
      isFound('grounds:parcel')
        ? ['pidge', "And that parcel on the step for G. Goose. A monocle. It's been shopping."]
        : ['pidge', "There's a soaked parcel on the front step, for a G. Goose. It rattles like a monocle."],
      ['pidge', 'Arrest that goose!'],
    ],
    zone: 'dining-room',
    at: 9,
    text: 'The goose did it. It has taken his chair at the head of the table, wearing the monocle it ordered by post.',
  },

  onSolved(at) { verdict.solved = at; },
  onOpen() { verdict.solved = null; },

  // A portrait for the case file: anyone in the case, in an oval gilt frame,
  // on their own ink. id: a cast id, 'goose', or 'someone' (a plain shadow
  // with a question mark: it could be anyone). w, h: the canvas area in
  // pixels; dpr: its pixel density.
  portrait(ctx, id, w, h, t = 0, dpr = 1) {
    const cast = CAST[id];
    const ground = id === 'goose' || id === 'someone' ? mix(INK.candleGold, INK.bone, 0.35) : mix(cast.color, INK.bone, 0.62);
    const cx = w / 2, cy = h / 2, rx = w * 0.44, ry = h * 0.45, edge = Math.min(w, h) * 0.045;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + edge, ry + edge, 0, 0, Math.PI * 2);
    ctx.fillStyle = MAT.brass;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, edge * 0.35);
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = ground;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Halftone and a warm spot of light behind the head.
    const k = h * 0.5; // pixels per unit
    setScreen(k * dpr, dpr);
    ctx.fillStyle = dots(shade(ground, 0.25), 0.18);
    ctx.fillRect(0, 0, w, h);
    ctx.beginPath();
    ctx.ellipse(cx, cy * 0.85, rx * 0.7, ry * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(INK.bone, 0.35);
    ctx.fill();
    const lines = Q.lines, detail = Q.detail;
    Q.lines = true;
    Q.detail = true;
    if (id === 'someone') {
      // Head and shoulders in shadow, and a question mark.
      ctx.beginPath();
      ctx.ellipse(cx, cy - h * 0.1, w * 0.15, h * 0.16, 0, 0, Math.PI * 2);
      ctx.moveTo(cx - w * 0.4, cy + h * 0.5);
      ctx.bezierCurveTo(cx - w * 0.38, cy + h * 0.12, cx - w * 0.2, cy + h * 0.08, cx, cy + h * 0.08);
      ctx.bezierCurveTo(cx + w * 0.2, cy + h * 0.08, cx + w * 0.38, cy + h * 0.12, cx + w * 0.4, cy + h * 0.5);
      ctx.closePath();
      ctx.fillStyle = mix(INK.stormNavy, INK.deepPlum, 0.3);
      ctx.fill();
      ctx.font = `400 ${Math.round(h * 0.22)}px "Bagel Fat One", "Arial Black", sans-serif`;
      ctx.fillStyle = INK.bone;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy - h * 0.09);
    } else if (id === 'goose') {
      const g = h * 0.62;
      ctx.translate(cx - g * 0.12, cy + g * 0.52);
      ctx.scale(g, g);
      monocleGoose(ctx, 0, 0, 0, t, { dir: 'r' });
    } else {
      // A bust: the head and shoulders, turned a little toward us.
      ctx.translate(cx - k * 0.05, cy + k * 1.78);
      ctx.scale(k, k);
      person(ctx, 0, 0, 0, dressed(id, { pose: 'stand', dir: 'r' }), t);
    }
    Q.lines = lines;
    Q.detail = detail;
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1, edge * 0.3);
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.restore();
  },
};
