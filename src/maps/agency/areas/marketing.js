// Marketing (greybox): funnels on every whiteboard, the Funnel (a meeting room
// with a funnel on its door), the swag closet, the Gantt chart, and in the
// spine Kayleigh filming the same seven seconds for social all day (she's on
// the level's clock, day.js, between coffee runs). Running gag: Take 47, every
// take ruined; and the LAUNCH sticky moving right an hour at a time.
import { C, folk } from '../../../engine/art.js';
import { block, pin, drawBlock, tag } from '../../greybox.js';
import { TONE, BLOCK, INK } from '../style.js';
import { floorOf, backWall, sill, pod, staff, room } from '../kit.js';
import { bearOClock, H } from '../clock.js';

export default {
  id: 'marketing',
  name: 'Marketing',
  blurb: 'Every whiteboard has a funnel on it. Kayleigh is on take 47 of a seven-second video.',
  describe: 'A marketing team\'s stretch of an open office: desks by the windows front and back, a glass meeting room with a funnel on its door, a closet stuffed with branded tote bags, a wall-sized project chart, and a woman filming herself with a ring light in the walkway.',

  build(R) {
    floorOf(R, 16, 32, { floor: TONE.marketing, name: 'MARKETING', nameAt: [24, 13.2] });
    backWall(R, 16, 32);
    sill(R, 16, 32);

    // Desks off the back wall.
    staff(R, pod(R, 20, 'back', 2), 520, { empty: [1], kinds: ['chart', 'chart', 'shop', 'chart'] });

    // The Funnel, and its cupboard (the tote bag of tote bags).
    room(R, 16.6, 6.4, 24.6, 11.8, 'THE FUNNEL', { door: 21 });
    const cupboard = R.poke({ id: 'cupboard', at: [17.6, 7.6, 0.9], r: 0.8, say: 'Swag overflow. The closet is full.' });
    R.thing(17.6, 7.6, (ctx) => drawBlock(ctx, 17, 6.8, 0, 1.2, 1.6, 1.4 + cupboard.k() * 0.2, C.wood, cupboard.k() > 0.5 ? 'OPEN' : 'CUPBOARD'), { anim: true });
    pin(R, { id: 'totes', label: 'A tote bag of tote bags', kind: 'poke', inside: cupboard, at: [17.6, 7.8, 1.6], r: 0.6, hint: 'The meeting room\'s cupboard is full of bags full of bags.' }, 1);

    // The swag closet: it holds the goose, among the plush mascots.
    const closet = R.poke({ id: 'swag', at: [29.8, 10.2, 1.2], r: 0.9, say: 'Do NOT open. Seriously. Everything falls out.' });
    R.thing(29.6, 8.4, (ctx) => drawBlock(ctx, 27.6, 6.6, 0, 4, 3.4, 2.6, C.white, closet.k() > 0.5 ? 'SWAG (OPEN)' : 'SWAG CLOSET'), { anim: true });
    R.goose((t) => ({ x: 29.6, y: 10.4, z: 0, dir: 'l', pose: 'sit', hidden: closet.k() < 0.5 }),
      { kind: 'poke', inside: closet, hint: 'Something in the swag closet is not a plush mascot.' });

    // The Gantt chart, and the LAUNCH sticky moving right by the hour.
    const gantt = R.poke({ id: 'gantt', at: [19.6, 14.8, 1.8], r: 0.9, say: 'LAUNCH has moved again. Nobody saw it move.' });
    void gantt;
    R.thing(19.6, 14.8, (ctx, t) => {
      drawBlock(ctx, 17, 14.6, 0, 5.2, 0.3, 2.4, C.white, 'GANTT');
      const k = Math.min(1, Math.max(0, (H(t) - 8.5) / 9));
      tag(ctx, 17.3 + k * 4.6, 14.9, 1.8, 'LAUNCH', { size: 0.26, fill: INK.sticky });
    }, { anim: true });

    // Take 47: the ring light (Kayleigh stands at it between coffee runs).
    block(R, 26.4, 15.6, 0.5, 0.5, 2.2, C.grey, 'RING LIGHT');
    pin(R, { id: 'ring-light', label: 'A ring light', at: [26.65, 15.85, 2.5], r: 0.7 }, 2);
    R.decoy({ id: 'balloon', at: [30.6, 16.4, 0.5], r: 0.7, say: 'A goose balloon from the last launch party. It has seen better days.' });
    block(R, 30.2, 16, 0.8, 0.8, 0.5, C.white, 'BALLOON');

    // Desks off the front wall: the fantasy football lineup on a screen, and
    // a trophy left out at bear o'clock.
    const front = [...pod(R, 19.6, 'front', 3), ...pod(R, 27.6, 'front', 3)];
    staff(R, front, 530, { empty: [4, 8], kinds: ['social', 'football', 'social', 'slides', 'social', 'email', 'social', 'slides', 'email', 'social', 'email', 'slides'] });
    const ff = front[1].mon;
    pin(R, { id: 'fantasy', label: 'A fantasy football lineup', at: [ff[0] + 0.2, ff[1], ff[2] + 0.5], r: 0.6 }, 3);
    pin(R, { id: 'trophy', label: 'A participation trophy', kind: 'hard', at: [front[7].mon[0] - 0.1, front[7].mon[1] - 0.5, 1.3], r: 0.6, when: bearOClock, note: 'bear o\'clock',
      riddle: 'Everyone gets one. Someone takes theirs out when nobody\'s looking.', hint: 'When the bear comes, someone at a front desk leaves a little gold cup out.' }, 4);
    folk; BLOCK;
  },
};
