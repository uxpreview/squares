# The Block (connected)

> Status: **Preview** (at gate 3) · Brief → Greybox → Art → QA → Preview → Shipped
> Owner approvals: brief [x] · greybox [x] (with changes, decisions 14 to 18) · preview [ ]
>
> It opens from `#/blockparty` (hidden from the picker). When it ships it takes over The Block's id, `block`, so saves carry over.

The Block as it is today, sixteen rooms on a plate with paper between them, becomes one city block: the same sixteen rooms, facing real streets, with the neighbors walking between them all day. It replaces today's Block in the picker (same id, `block`, so saves carry over).

The owner's calls (start of session 4): **a city block** (the rooms become shops and venues on streets, not one big building and not a new neighborhood); **geese plus a light story** (a goose per room stays the goal, with one block-wide story tying the rooms together); this session writes the brief and builds the engine it needs.

## In one line
It's the day of the Block's annual party, the Courier has a parcel for "G. Goose, The Block", and there's a goose in every one of the sixteen rooms.

## The story
A light one. It runs on the streets and never gets in the way of the geese.

**The setup.** Today is the Block Party. All day, everyone is carrying things into the street for it: bunting, a stage at the crossroads, the bakery's wedding cake, the laundromat's giant sheet (it becomes the banner), the band's amps. Meanwhile **the Courier** (first appearance as a character; so far he's only been a parcel) has one parcel, addressed to "G. Goose, The Block", and no door number. He tries every door on the block, one after another, all day. Every door has a goose behind it.

**What the player does.** Find the goose in each room, as now. The street finds are the Courier's trail: the "Sorry we missed you" cards he leaves at every door, his dropped map with sixteen circles on it, his lunch, and so on (see Finds). The story tells itself through him: he gets more lost and more desperate as the day goes on.

**The ending.** Find all sixteen geese and the party starts: the geese come out of their rooms and conga down Main Street (the victory lap, rerouted along the street), the Honks play the stage, and the Courier finally hands the parcel over. All sixteen geese sign for it. It's a single sock (the laundromat's lost one; see the running gags).

## Shape
- **One city block, still a square**, so the Block stays recognizable (and The Block, But Wrong can still reuse it). The rooms keep their places on the 4 x 4 grid, but the gaps between them open up into streets:
  - **Main Street** runs through the middle both ways (a cross), wide enough for a road and kerbs. The crossing in the middle is the hero: the party stage.
  - **Back alleys** run between the other rows and columns, narrow, with bins, cats and washing lines.
  - **The pavement** runs along the two front edges (the ones facing you), where the queue for the party forms.
- **Walls down on the overview**, as at the Manor: the back walls that face a street are the shopfronts, and they drop to waist height when you're not in that room, so you can see the streets and into every room at once. Step into a room and its walls rise. (Streets are narrower than a wall is tall, so with walls up you can't see them at all; the test map proved it.)
- **Doors onto the street.** Every room gets a door in a back wall onto the street or alley behind it. People come and go through them.
- **Silhouette:** the square, but broken: a water tower and the rocket poking up, the observatory dome, bunting strung across the streets, the stage at the center.
- **Size:** about the same as today's plate (roughly 85 units corner to corner instead of 79), so the phone framing (fill the height, swipe to the sides) still works.

Draft plan (units; rooms are 16 x 16):

| | Col 1 | | Col 2 | | Col 3 | | Col 4 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Row A | Observatory | alley | Launch Pad | **Main St** | Rooftop Pool | alley | Arcade |
| | *alley* | | *alley* | **Main St** | *alley* | | *alley* |
| Row B | Greenhouse | alley | Roller Disco | **Main St** | Library | alley | Ice Rink |
| | **Main St** | **Main St** | **Main St** | **the stage** | **Main St** | **Main St** | **Main St** |
| Row C | Noodle Bar | alley | Bakery | **Main St** | Laundromat | alley | Ball Pit |
| | *alley* | | *alley* | **Main St** | *alley* | | *alley* |
| Row D | Umbrella Shop | alley | Aquarium | **Main St** | Band Practice | alley | Model Railway |

Main Street 9 wide, alleys 4, the pavement 4, along the front edges.

## Areas

Nineteen: the sixteen rooms (they keep their art, their finds and their jokes, with a door added and signs moved off the shopfront walls, below) and three outdoor areas, each one area of any shape (new this session: see Engine).

| Area | What's happening | Running gag (plays out over time) | Finds |
| --- | --- | --- | --- |
| **Main Street** (the cross) | The party being built all day at the crossroads: bunting, the stage, a bouncy castle that won't inflate, a bin lorry trying to get through | The bouncy castle inflates, sags, inflates, sags; every time it's nearly up someone sits on the pump | The Courier's trail, the party's |
| **The Alleys** (the lanes between) | Bins, cats, washing lines between windows, a raccoon, the kitchen doors of the noodle bar and the bakery | The octopus, escaped from the aquarium again, heads down the alley toward the noodle bar. Someone carries it back. It tries again | Curiosities |
| **The Pavement** (the front L) | The queue for the party, a hot dog cart, a newsstand, a busker | The queue for the party starts at the stage and by evening reaches right round the corner, and nobody knows what it's for | Curiosities, one Courier card |
| The sixteen rooms | As today | As today | As today: a goose and three things each |

What each room keeps and gains is for the greybox; the idea is that every room lends the street one thing: the bakery's cake, the laundromat's sheet, the band's amps, the library's shush (the librarian keeps coming out to shush the sound check), the ice rink's snowman judge (scoring the party), the rocket (it launches at the party's climax; the mechanic is still on it).

## Cast
- **The Courier**, in his brown uniform with the parcel, all day, door to door. Recurring from now on.
- **Inspector Pidge**, arriving from the Manor case, still one place behind the goose; he arrests a pigeon.
- **The neighbors**, about sixteen named people on one clock (like the Manor's evening): the baker carrying the cake, two laundromat regulars carrying the sheet, the librarian, Gary the astronomer (still missing every shooting star), the lifeguard, the launch pad's mechanic, the noodle chef, the DJ, the snowman judge (wheeled out on a trolley), the band.
- **The crowd**: people who aren't named, crossing the street, queueing, dancing at the party.
- **The octopus.** On the run.

## Palette and plate
The Block's own plate, unchanged: the cream paper and the six inks in `C` (`src/engine/art.js`), halftone dots, the registration marks. Streets in a grey-lilac road ink with cream kerb lines; the bunting in the six inks.

**If the day loops (open question 1):** the plate itself changes through the day: paper warm at dawn, full at noon, amber at the party, navy at night with the windows lit (the Manor's night lighting, `R.light` and `R.dark`, on a schedule), and back.

## Alive
- **People on one clock:** every named neighbor has a day, room to room through the doors (the Manor's `schedule()`), as the Manor has an evening. The Courier visits every door once per loop.
- **Traffic:** a moving connector that circles the block, the Courier's van (or an ice cream van), stopping, blocking the street, honking back at the geese.
- **The party builds** over the loop: bunting up by midday, the stage by afternoon, everyone in the street at the party, then everyone drifts home.
- **Sound bed:** street noise under the honks: traffic, the sound check, the crowd at the party.

## Mechanic
**A day on the Block, in a loop** (open question 1). The rooms already have their own hours in their stories: the bakery at 5am, the pool at noon, the observatory and the disco at night, the laundromat at 2am. On one connected block they can't all be the same moment, so the whole block runs through a day in about six minutes, and each room is busiest at its hour: the bakery's queue at dawn, the pool at noon, the party at sunset, the stars at night. Finds stay visible all day (fairness); what changes is the life and the light.

## Finds
- **The sixteen geese**, one per room, as now. Finding every goose is still what finishes the place.
- **The room things**, three per room (48), as now, so nothing a player has already found is lost.
- **On the streets**, about 8 to 10 more (draft labels, each unique):
  - Main Street: *The Courier's map* (sixteen circles, all crossed out), *A signed delivery slip* (signed with a webbed foot), *A roll of bunting*, *The Courier's lunch*.
  - The Alleys: *A tentacle print* (the octopus's trail), *The noodle bar's back door key*, *A cat in a bin*.
  - The Pavement: *A "Sorry we missed you" card*, *Tomorrow's newspaper* ("GOOSE HELD IN MANOR CASE").

The story finds are the Courier's; they're for fun and story, not needed to finish.

## Shared universe
- **The goose**, sixteen times, and its party.
- **The Courier**, as a character for the first time, with the parcel for G. Goose (at the Manor it was a soaked parcel on the doorstep).
- **Inspector Pidge**, straight from the Manor.
- **"Have you seen this goose?"** posters on every lamp post, and the blimp overhead, as now.
- **The Manor**, in the newspaper headline, and the monocle: the goose at the Manor's reveal wore one; one of the sixteen geese here does too.

## Tone
The Block's: warm, silly, all ages, with the odd adult joke in the margins (the queue nobody knows the reason for, the lifeguard's opinions). No mystery pressure: it's a party.

## Engine and kit needs
- [x] **Areas of any shape** (E5): a street is one area, drawn in chunks sorted in with the rooms, so it runs behind rooms at the back and in front of rooms at the front. Taps, framing, finds and people all work across it. *(Session 4: `shape` and `size` on a zone, "Chunks" in `src/engine/zone.js`, proved on the hidden test map `#/crossroads`.)*
- [x] **People walking between rooms and outdoors** on one clock: the Manor's `walkers` and `schedule()`, now with streets covering the gaps (so nobody vanishes between areas). *(Session 2, and session 4's test map.)*
- [x] **Walls down on the overview**, full height inside a room. *(Session 2: `cutaway.walls`.)*
- [x] **The day:** a loop clock for the whole block (six minutes, dawn to dawn); the paper changes with the hour, and the page and the browser's bars follow it (`plate.at(t)` on a map); rooms darken and glow at night, streets darken and their lamps light. *(Session 4b: `src/maps/blockparty/day.js`, the paper's hours in `style.js`.)*
- [x] **The new plan:** `src/maps/blockparty/plan.js` with the streets, the doors, the lanes people walk and where every room sits. The map cuts each room's door (`doors` on a zone's place, so a room can sit on two maps). *(Session 4b.)* Still to do in the art: signs off the shopfront walls onto hanging signs and awnings.
- [x] **The day's timeline:** `src/maps/blockparty/day.js` (like the Manor's `evening.js`). *(Session 4b.)*
- [x] **Framing a long area on a phone:** a street is framed a room's worth at a time, around where you tap it (or around a find, for QA); panning along it moves that spot. *(Session 4b: `zoneBox` in `src/engine/world.js`.)*
- [ ] **A moving find** that circles the block (the van): a find already can move, within its own area; the van needs its own area, or a find that belongs to the street and follows the road.
- [x] **The victory lap along Main Street** instead of round the plate. *(4c: `finale.js`; a map can name a `finale`: the clock it jumps to, where the camera goes, how long before the card.)*
- [x] **QA:** the Block's speed with walls down, the streets and the walkers, against the budget the Block itself set. *(4c: see the roadmap, 4c.)*

## Open questions
**Answered at gate 1 (session 4b): every recommendation, as written.** A day on a loop; the party and the Courier; the Main Street cross; walls down, all sixteen rooms kept, old saves as they are. Kept below for the record.

1. **What time is it?** A whole day on a loop, each room busiest at its hour (recommended: it's the mechanic only this place has, and it fixes the rooms' clashing hours). Or one moment, a Saturday afternoon, with the bakery's, the laundromat's and the observatory's stories reworded (much cheaper).
2. **The light story:** the party and the Courier's parcel, as above (recommended). Alternatives: the party only, no Courier; or a lost-and-found where each room has lost something another room found.
3. **Walls down on the overview**, with signs moved off the shopfront walls (recommended; streets can't be seen otherwise). The alternative is rooms with low shopfront walls all the time, which loses the dollhouse look inside a room.
4. **The layout:** a cross of Main Street through the middle, alleys between the rest, and the pavement along the front (recommended). Or all sixteen rooms round a central square.
5. **Keep all sixteen rooms?** Some are odd on a street: a rooftop pool on the ground, a rocket launch pad in a city block. Recommended: keep them all (the jokes survive: the pool becomes the Lido, and the launch pad is a vacant lot where the mechanic has built a rocket), rather than swapping any out.
6. **Old saves:** every find keeps its name, so a player's geese and things carry over. A player who had finished the Block will find it open again (the streets add new things, but no new geese). Recommended: fine as it is.

## Decisions

Gate 1 (the brief), from the owner at the start of session 4b:

1. **A day on a loop**, each room busiest at its hour.
2. **The party and the Courier's parcel** for the light story.
3. **The Main Street cross**, alleys between the rest, the pavement along the front.
4. **Walls down on the overview**, all sixteen rooms kept (the pool as the Lido, the launch pad as a vacant lot), old saves as they are.

The greybox (session 4b), for the owner's gate 2:

5. **Where it lives until it ships:** a hidden place, `blockparty` (`#/blockparty`), built from The Block's own room files, so the Block in the picker keeps working. At ship it takes over the `block` id.
6. **Sizes:** rooms 16, alleys 4, Main Street 9, the pavement 4: 85 units corner to corner (the Block was 79). The phone framing is the Block's: fill the height, swipe to the sides.
7. **Walls:** the rooms now draw their back walls with the engine (`R.walls`), so walls facing a street drop to waist height (1.2) on the overview; the walls on the outside of the block stay full height, so the back of the block still frames the picture. Fences (the pool, the launch pad, the ice rink) stay fences. The Block in the picker looks the same (checked pixel by pixel: under half a percent of each room differs, along the wall edges).
8. **Doors:** one per room, in the back wall onto the street behind it. Where a room already paints a door on that wall, the opening goes through it (the bakery's street door, the ball pit's fire exit, the band's side door, the noodle bar's kitchen door, onto Main Street); the rest sit 12.5 along the wall, for the art pass to dress. **The Observatory, in the back corner, has no street behind it:** you go in from the alley along its front, and it's the Courier's "Is this even a door?" stop.
9. **The day:** six minutes, dawn at 5am, an hour every 15 seconds. The paper: night navy to 4am, warm at dawn, paper all day, amber at the party (7pm), a purple dusk, navy from 10pm. At night the page's loose text goes to the light ink, as at the Manor.
10. **People:** 21 on the clock. The Courier knocks on all sixteen doors by the party; the baker, the laundromat's regulars (the sheet), the band (the amps), the snowman judge and a crowd all come out to the stage at sunset; the librarian shushes the sound check three times; Inspector Pidge arrests a pigeon; the octopus makes three runs for the noodle bar and the keeper carries it back each time; Gary looks up at night; the bin lorry tries to get down Main Street all morning. People who live in a room vanish just inside their door while they're home, so they never stand in the furniture.
11. **People walk lanes:** the middle of each alley, both kerbs of Main Street, the middle of the pavement. Any two points on lanes join up (`route()` in `plan.js`), so a walk is written as "go to this door".
12. **The streets' finds** are pins for now: four on Main Street (the Courier's map, a signed delivery slip, a roll of bunting, the Courier's lunch), three in the alleys (a tentacle print, the noodle bar's back door key, a cat in a bin), three on the pavement (a "Sorry we missed you" card, tomorrow's newspaper, a queue ticket). 58 things and 16 geese in all.
13. **The first screen** points at the stage: "The Block Party is today. A goose in every room. Step inside."

Gate 2 (the greybox), from the owner after the health pass (September 2026): **approved with changes.** 4c builds these in, on top of what's left for the art below:

14. **Night darkens the streets and the sky, not the rooms.** The rooms stay near full brightness after dark (lit windows, lamps on), so every find reads at any hour; the flat navy over the rooms goes. The streets, the pavement and the backdrop take the night.
15. **The stage is the hero:** bigger and taller, with a backdrop behind it, so it reads from the whole overview. The bouncy castle moves off the crossing (somewhere on Main Street where it doesn't crowd the stage).
16. **The party's light is a pink sunset,** not amber: lighten the 7pm paper toward pink.
17. **The alleys get one hot spot,** on the octopus's route to the noodle bar, and all three alley finds (the tentacle print, the noodle bar's back door key, the cat in a bin) sit there, so the alleys have a place worth looking rather than three finds spread thin.
18. **On a phone, the invitation card pins by the back corner,** not over the stage.

Also seen at the health pass, on the owner's Mac (desktop and phone, dawn, the party and night), for the owner's call in 4c:

- **The shipped name.** On a street the back button reads "‹ The Block", while the title says "The Block Party". When it takes over the `block` id, is it still called The Block Party, or back to The Block with the party as its story?
- **The party queue** stands in one tidy row along the whole front edge of the pavement, so from the overview it reads as a fence. Looser clumps, thickest by the stage end, would read as a queue.
- **HONK bubbles and the invitation** both sit near the middle on a phone and can touch (seen at the party and at night). Moving the card (decision 18) may settle it; otherwise keep honks away from the card.
- **At night the print marks and the "GREYBOX" caption vanish** (they're printed in the day's ink on the navy). The Manor prints its words in the light ink at night; the marks here could do the same.
- **The blimp crosses the title** on desktop (by day under its first letters, by night over "Party"). Keeping its path clear of the top left would stop it.
- **QA's close-finds warning** carries over from the Block: in the Roller Disco the goose and the slice of pizza are within 12px on a phone.

The health pass's open calls, answered by the owner at the start of 4c (every recommendation):

19. **It ships as The Block Party.** The title, the picker and the back button all say it; it still takes the `block` id, so saves carry over.
20. **The party queue stands in loose clumps,** thickest at the Main Street end, thinning round the corner, instead of one tidy row.
21. **HONK bubbles keep clear of the invitation card,** wherever it's pinned.
22. **At night the print marks and the caption print in the light ink,** as the Manor's words do.
23. **The blimp flies clear of the title:** across the block the other way, top right to bottom left.

The art, QA and preview (session 4c). All of "left for the art" is built:

24. **The rooms keep their files.** What a room shows the street is its front, `fronts/<id>.js`: a sign that reads from the overview and is a joke up close, the door dressed, an OPEN or CLOSED card on its hours, the doorway glowing at night while it's open, and its rush (extra people at its hour, `HOURS` in `clock.js`). Anything a room does differently here (windows showing the hour's sky, clocks on the day's time, the rocket, the snowman's empty spot) is in the room file behind `R.opts.day`, which only this map passes, so The Block in the picker is unchanged (checked pixel by pixel, room by room; the disco's pizza moved on both, off the goose).
25. **Painted signs stay on the walls** (you see them inside); the street sees the fronts. A front standing outside a back wall hides while you're in that room (its wall is up) and shows on the overview.
26. **The stage fills the crossing:** a deck 6.2 square and 1.4 high, a backdrop 7 high on its back edges ("BLOCK / PARTY", "ALL WELCOME* / *even geese"), built through the day (a frame at dawn, the deck by noon, the backdrop by 1:30, the band's gear and lights by 2:30). Main Street's walking lanes moved to 0.9 from each kerb so people pass it; the Honks play up on the deck. The bouncy castle is on the left-hand arm by the noodle bar.
27. **The night:** the streets are printed in night inks (navy and lilac), nothing dimmed on top; the rooms stay lit with a soft warm glow; lamps glow. The pink sunset holds to 8pm, dusk at 9, night from 10.
28. **The ending:** the last goose jumps the clock to the party (7:48pm) and flies the camera to the stage; the sixteen geese come off it one by one and conga round Main Street; the Courier hands over the parcel on the front of the stage ("It's a sock."); the card comes after nine seconds. The laundromat's LOST poster shows the same sock.
29. **The rocket** goes up once a day at 8:48pm, at the height of the party (the countdown board from 7:30, the crowd behind a rope, half the party turns to look); a new one is wheeled out by dawn.
30. **The pool is The Lido** on this map ("NOW ON THE GROUND FLOOR"); its file keeps "Rooftop Pool" for The Block.
31. **The invitation** is pinned over the stage's backdrop on a desktop (so the stage still shows), and at the Observatory on a phone.
32. **Sound:** a street bed (traffic and people), and cues taken from the day itself: the lorry's horn when it says HONK, the librarian's shush, the sound check's thumps, the crowd at the party, the rocket.
33. **The cast** wear their parts (the Courier's brown uniform and parcel, the Honks' goose tees, the snowman judge's score cards and melt) and no name tags; speech shows close up.

For the owner at gate 3:

- **Shouting or not:** the rooms and fronts shout in capitals ("IS IT 5 YET?"); the streets, the cast and the ending speak in sentence case ("Ooh, a seat.", "It's a sock."). One way everywhere, or keep the mix (capitals for signs and crowds, sentence case for the named cast)?
- **Neon by day:** the arcade's and the disco's neon only glow at night (a glow by day cost too much every frame).
