# All You Can Eat

**October 2026 (session 12): the ship is a chase.** The mystery is the Manor's alone (STRATEGY.md); the iguana is loose and you follow it, sighting by sighting, deck to deck through the day, and corner it at the gangway as the ship docks. **"The chase" below is how it plays now, and overrides the whodunit sections after it** ("The story", the evidence in "Finds", "Mechanic"), which record the ship as it shipped in session 7.

> Status: **Shipped** · Brief → Greybox → Art → QA → Preview → Shipped
> Approvals: brief [x] (the lead's call, decisions 1 to 16) · greybox [x] (the lead's call, decisions 17 to 27) · preview [ ] (the owner)
>
> Session 7 (Sept 2026), built alongside Boston (Moving Day) in another session. Boston owns engine changes this round (PROCESS.md, "Two levels at once"), so this level is built only from what exists: storeys and the lift (the Manor), walkers on one clock, the whodunit format (`game/case.js`), a place's own dial (Plum Island's tide), and a plate that changes with the clock (the Block Party). It keeps to `src/maps/cruise/`, this brief, and its own lines in shared files.

## The chase (session 12)

**In one line:** patient zero is a stowaway iguana, it's loose, and nobody can catch it; follow it round the ship through the day and corner it before it gets off at the port.

**How it plays.** The ship's goal is no longer a case to solve: it's the trail (`src/game/trail.js`, the format, G7; `src/maps/cruise/trail.js`, the ship's). Eight sightings of the iguana, each a find, in order through the day. Only the next one can be found, and only in its hours; the list shows just that one, with the witness who saw it go there under its name; the ship's clock skips to a moment in every sighting's hours. Find it and it bolts (you see it run off), the toast says who saw where it went, and the next sighting is on the list. The Trail button (where Case was) opens the log: every sighting so far, its witness and what was seen, the next one lit, the rest "Not seen yet." The eighth corners it at the gangway as the ship docks: the clock goes to 6:15pm, the camera to the Casino, and the card says **Caught**.

**The iguana is always one step ahead.** It's drawn only at the sighting you're on, in that sighting's hours (`chase.step` in `style.js`; `sighting()` in `kit.js` draws and registers it). So every iguana anyone sees is the one to tap, and nobody stumbles on the last sighting first. It isn't on the clock any more (`day.js`): there is no iguana walking the ship or lying on its lounger all day.

**The trail:**

| # | Area | Hours | Witness (the line that points there) | Where it hides | Kind |
| --- | --- | --- | --- | --- | --- |
| 1 | The Buffet | 7 to 9am (breakfast) | Pidge: "The camera saw it in the salad bar at 6:52." | In the salad bar, under the lettuce: lift the lettuce | poke |
| 2 | The Cabins | 8:45 to 10:30am (9am) | Doreen: "It beat me to the melon, then took the lift up." | The honeymoon suite, posing as one of the towel animals, eating the flowers | hard |
| 3 | The Waterslide | 10am to noon (the drill) | The steward: "A towel animal walked up to the sun deck." | Up the waterslide tower, shedding its skin | hard |
| 4 | The Pool | 11:45am to 1:30pm (noon) | Tyler: "It came down the slide and went to the big pool." | Winning the limbo | spot |
| 5 | Adults Only | 1:30 to 3pm (2pm) | Kelly: "Our limbo champion! Then it wanted somewhere quiet." | At the spa, under a seaweed wrap, cucumbers on its eyes | poke |
| 6 | The Crew Bar | 3 to 4:45pm (the crew party) | Gloria: "It took my cucumbers and went to a party below." | At the crew party, the only green thing below the waterline | hard |
| 7 | The Engine Room | 4:45 to 6pm (5pm) | Chef Gaston: "It ate my plastic shrimp. Now it needs a nap." | Napping somewhere warm | poke |
| 8 | The Casino | 5:45 to 7pm (docking) | The captain: "It'll try the gangway. Nobody gets off." | At the gangway, trying to get off at the port | poke |

The ending: in the Casino, from the moment it's caught, the iguana is under a towel at the gangway desk and the clicker says 2,400 again. Exact hiding places are the area artists' (what they drew is in "The chase, as drawn" below).

**Witnesses.** The old suspects and the cast say where they saw it go (the ship's six suspects all appear, as witnesses now). Their line is on the list under the next sighting, in the toast when the one before is found, and in the log. Tapping a person to ask them isn't built (people on the clock aren't tappable; E8 later).

**Decoys are iguana lookalikes,** one joke each across the ship (a green pool float, a dinosaur toy, a cucumber, a lizard on a slot machine), answering back when tapped.

**What stays.** Every area, the day, the cast, the dial, the port. The case's seventeen evidence finds keep their ids and are ordinary things now, so saves carry over; a player who solved the case has the place finished already. The goose is still at the drill in its life jacket, one of the things, not the goal. The kinds of find, pokes and decoys come to the ship this session (the rules from session 9, as the Block Party got them in session 10).

**On the old brief:** the culprit card, accusations, alibis and the reveal at the pool are gone. Gloria's mask, Chad's cocktails, the captain's seasickness and Tyler's slime stay as jokes (and as the green people the iguana hides among), not as red herrings.

## In one line
Day four on a cruise ship, cut open from bow to stern: something from the buffet is going round, deck by deck, and you have until the ship docks to find patient zero.

## The story
A whodunit, in the Manor's format: evidence and curiosities, a case file, accusations any time, a reveal. The goose is not the culprit this time (manor.md decision 2).

**The setup.** The *MS Bottomless*, day four of seven. At 7:00 this morning the breakfast buffet opened. By lunchtime people were going green on every deck. The ship docks at 6pm at a little island port, and the port has already said nobody's getting off. **Inspector Pidge** is on board on holiday (Hawaiian shirt, same trench coat over it) and has appointed himself the investigation.

**What the player does.** Watch the day and search the decks. Everyone who turns green does it at their own time, so the order they go green in, and where they ate, is part of the evidence. Find the evidence, then accuse. A wrong accusation gets that suspect's alibi (and a joke). The right one plays the reveal.

**The case file's question:** *Who is patient zero?*

**The suspects.** The ship is full of people who look green, for every reason but the right one.

| Suspect | Why they look like patient zero | Points at them (find) | Clears them (find) |
| --- | --- | --- | --- |
| **Doreen**, first in line at every buffet since 1987 | She was in the buffet at 7:00 sharp and touches everything | Her tongs, a scrunchie on the handle, used on every tray (The Buffet) | Her queue ticket: **number 2**. Someone was in the buffet before her (The Buffet) |
| **Chad**, on spring break in October | Carried back to his cabin at 11am, green | A bucket outside his cabin, with his name on it (The Cabins) | His bar tab: 31 Green Mermaids since breakfast. He's green from the cocktails (The Pool) |
| **Gloria**, who lives at the spa | Green in the face since dawn, and in the buffet for the eggs | (no find: everyone saw her) | Her spa card: cucumber mask, 6 to 11am. It's a face mask (Adults Only) |
| **Captain Stubbs** | Green, and hasn't left the bridge in four days | A bucket by the ship's wheel (The Bridge) | A box of 500 seasickness patches. He's been green since 1996 (The Bridge) |
| **Chef Gaston**, the buffet's chef | His shrimp tower, the buffet's centerpiece, out since Tuesday | A shrimp on a toothpick flag, from the top of the tower (The Buffet) | A box of plastic display shrimp. The tower is fake; it's been out since 2009 (The Crew Bar, where the galley's stores are) |
| **Tyler**, eight, loose | Green hands, and he's been on every deck | Green handprints on a slot machine (The Casino) | The kids' show's slime kit, lime, made at 10am. His hands are green from the show (The Theater) |

**The solution.** Patient zero is **an iguana**. It came aboard at the last port, up the gangway at 11pm, and spent the night eating its way through the ship: the flower garlands from the welcome party, then the buffet, where it sat in the salad bar at 6:52am, eight minutes before the doors opened, walked through the butter sculpture and was gone when Doreen's number was called. Reptiles carry salmonella. It has been sunbathing by the pool all day, in plain sight, the greenest thing on board, and nobody looked twice.

The evidence against it (all six are needed to name it):
1. **Claw prints through the butter sculpture** (a swan), with a tail drag (The Buffet).
2. **A flower garland, nibbled**, from the last port's welcome party, in the honeymoon suite (The Cabins).
3. **A patch of shed skin**, green, on the waterslide's top platform (The Waterslide).
4. **The gangway clicker: 2,401 aboard.** The manifest says 2,400 (The Casino, where the atrium's gangway desk is).
5. **The doctor's lab slip:** "Salmonella. The reptile kind." (The Sick Bay).
6. **A security camera still, 6:52am:** a green blur in the salad bar (The Bridge, on the captain's monitors).

The culprit's card is **"Someone else?"** (a plain shadow and a question mark), with the line **"Not on the manifest"**, until all six are found.

**The reveal.** Pidge sums up; the camera goes to the pool, where the iguana is on a sun lounger in sunglasses with a Green Mermaid, and the lifeguard is putting a towel over it. "Patient zero was a stowaway iguana from the last port. It's not getting off either."

**The crew are the clue nobody reads.** The crew eat in the crew mess, never the buffet, and nobody below the waterline goes green all day. Their party is the best on the ship.

## Shape
- **The ship is the picture:** long, on the diagonal, stern at the top left, bow at the bottom right (x runs along the ship, 80 units; y across it, 16). It sits on the sea, which is the paper and runs to every edge of the screen (like Plum Island).
- **Cut open along its whole side.** The side facing us (port side) is gone, so you look into every deck like a dollhouse. The far side (starboard) is the back wall: the inside of the hull, portholes and windows. The stern is the other back wall, with the ship's name on its outside.
- **Four decks, one lift.** Stacked on the Manor's storeys (7.1 units floor to floor), changed from the lift, which here is the ship's elevator panel: **SUN DECK, CABINS, PROMENADE, CREW ONLY**. The deck you're on is solid; decks above lift off and hover, faint, like an exploded diagram; decks below show through the cut side, each one's front half.
- **Below the waterline:** the sea's surface meets the hull a little above the crew deck's floor, so the crew deck is seen through the water, printed in the sea's ink, like an aquarium. Step into it and the water tint lifts.
- **Silhouette:** a cruise ship, not a box. The bow tapers to a point, the stern is square with its name on it, a big red funnel and the corkscrew of the waterslide stick up from the top deck, lifeboats hang along the far rail.
- **The hero:** the buffet, the crime scene, in the middle of the Promenade. On the skyline: the funnel and the waterslide.
- **The port**, a little palm island off the far side, ahead of the ship (to the right of it on screen), where the sea's otherwise empty: a pier, a hut, a welcome banner, the yellow quarantine flag at the end. The ship reaches it at 6pm and nobody gets off.
- **On a phone** held upright, the overview fills the height round the middle of the ship (the buffet), and the bow and stern run off the sides: a swipe along the ship, like Plum Island. On its side, and on a big screen, the whole ship.

The plan (world units; x along the ship from the stern, y from the far side to the cut side; every deck 16 deep):

| Deck (storey, z) | x 0 to 16 | x 16 to 48 | | x 48 to 80 (the bow tapers from x 64) |
| --- | --- | --- | --- | --- |
| **Sun Deck** (14.2, open air, rails not walls) | **The Waterslide** (0 to 16) | **The Pool** (16 to 48) | | **The Bridge** (48 to 80) |
| **Cabins** (7.1) | **The Cabins** (0 to 48, a corridor of cabins) | | **Adults Only** (48 to 80) | |
| **Promenade** (0) | **The Theater** (0 to 16) | **The Buffet** (16 to 48) | | **The Casino** (48 to 80) |
| **Crew Only** (-7.1, below the waterline) | **The Engine Room** (0 to 16) | **The Crew Bar** (16 to 48) | | **The Sick Bay** (48 to 80) |
| **Outside** (the sea, -0.6) | **The Port**, off the far side, ahead (x 60 to 78, y -34 to -18) | | | |

**Connections:** a lift in the same place on every deck (against the far wall, x 10.4 to 13.6; decision 28), so people vanish into the lift doors on one deck and step out on another; doors between the areas on each deck, along a corridor by the far wall. On the Sun Deck the areas are open to each other (a rail with gaps).

## Areas

| Area | Deck | What's happening | Running gag (plays out over time) | Finds |
| --- | --- | --- | --- | --- |
| **The Waterslide** | Sun | The stern end of the top deck: the corkscrew waterslide tower, the big red funnel, mini golf, the splash pool at the slide's foot, lifeboats hanging on the far rail | **The slide queue:** one big man goes down and gets stuck in the corkscrew; the queue at the top grows; the lifeguard pokes him with a pool noodle until he shoots out, and the queue goes again | A patch of shed skin (evidence); a flip-flop on the funnel |
| **The Pool** | Sun | The pool, deck chairs in rows, the pool bar (Green Mermaids), the hot tubs, the lifeboat drill along the rail, the limbo contest at noon. The iguana on a sun lounger, all day | **The towels:** every lounger has had a towel on it since 5am and nobody on any of them. At 10am the drill: the cruise director with a megaphone, everyone ignoring her, only the goose in a life jacket, at its muster station. At noon the limbo bar goes lower until only the iguana can get under | Chad's bar tab (evidence); a lounger reserved since day one; the goose (in a life jacket at the drill) |
| **The Bridge** | Sun | The bow: the wheel, radar, the captain's monitors (CCTV of every deck), a couple doing the famous pose on the very tip of the bow all day | **The captain:** green at the wheel all day, one hand on a bucket; the first officer steers with one finger while he's not looking. The couple on the bow keep the pose through spray, wind and a gull | A bucket by the wheel (evidence); a box of seasickness patches (evidence); a camera still, 6:52am (evidence) |
| **The Cabins** | Cabins | A corridor of cabins, doors open, 1 to 12. Cabin 7: a divorce, live. The honeymoon suite. The room steward's towel animals on every bed. Room service trays in the corridor | **Cabin 7:** Brenda and Ray fight across the corridor; every hour a new thing goes out the door (a suitcase, a lamp, the other suitcase, Ray). **The stewards** carry Chad home at 11am, feet first. The towel animals get more elaborate each cabin (a swan, an elephant, a towel Ray) | A bucket outside Chad's cabin (evidence); a flower garland, nibbled (evidence); a towel monkey on a lampshade |
| **Adults Only** | Cabins | The quiet deck at the bow end: the spa (cucumber masks, a seaweed wrap), a hot tub, loungers, a "Serenity" sign; a very loud man on a phone | **Serenity:** the adults-only lounge is louder than the kids' club: every hour someone new gets shushed by the attendant, who is the loudest of all | Gloria's spa card (evidence); a "Do not disturb" sign on a hot tub |
| **The Theater** | Promenade | The ship's theater at the stern end: a magician's matinee, the kids' show (slime) at 10am, the cruise director's bingo at 3pm, rows of red seats | **The magician's rabbit:** it escapes at the start of the act and is seen all day on other decks; he keeps producing other things from the hat (a chicken leg from the buffet, a shoe, a very surprised Pidge) | The slime kit (evidence); a rabbit in a lifebuoy |
| **The Buffet** | Promenade | The crime scene. The all-you-can-eat buffet, open 7am to midnight: the queue at the doors, the salad bar, the butter sculpture (a swan), the shrimp tower, the chocolate fountain, the sneeze guard, trays of everything. Chef Gaston behind the carving station | **The queue:** at 7am the doors open and the ship pours in; Doreen first (she's number 2). Through the day the plates get bigger and the people get greener; at 1pm the doctor closes the salad bar with tape, and people reach under the tape | Doreen's tongs (evidence); her queue ticket (evidence); claw prints in the butter (evidence); a shrimp on a toothpick flag (evidence) |
| **The Casino** | Promenade | The casino at the bow end, open at 9am (a queue of retirees with cups of coins at 8:59), the atrium with its glass lift and the gangway desk (the security officer with the clicker), the duty-free shop | **Open at 9:** the man at the roulette wheel has been on the same stool since day one, putting everything on green. It comes up at 6pm | The gangway clicker (evidence); green handprints on a slot machine (evidence) |
| **The Engine Room** | Crew | Below the waterline at the stern: the two big engines, the propeller shafts, pipes, gauges, a hammock strung between two pipes | **The engineer's nap:** the engineer sleeps in the hammock through every alarm; a younger engineer keeps tapping a gauge that keeps going up | A hammock between two pipes |
| **The Crew Bar** | Crew | The crew's own party below the buffet: fairy lights, a karaoke machine, laundry carts as seats, the galley's back stores (tins, crates of plastic shrimp), the crew mess ("CREW DO NOT EAT THE BUFFET") | **The better party:** it builds all day; at 3pm the off-shift crew arrive and it goes off; nobody down here is green, ever. A waiter comes down the stairs and changes his whole face to smiling before he goes back up | The display shrimp (evidence); a disco ball made of spoons |
| **The Sick Bay** | Crew | The doctor's office at the bow end, beds full by noon, a queue down the corridor, a quarantine room with a porthole, a "DAYS WITHOUT AN OUTBREAK: 0" sign | **Dr. Swabb:** the ship's doctor, alone, with a clipboard, getting greener, insisting it's fine; the line grows every hour; the sign's number is changed back to 0 each time a crewman tries to make it 1 | The lab slip (evidence); a thermometer in a pudding |
| **The Port** | Outside | A tiny palm island: a pier, a tiki hut gift shop, a steel band, a banner ("WELCOME MS BOTTOMLESS"), the harbourmaster with the yellow flag. The tender boat (the Courier's) circles between the ship and the pier all day, never allowed to land | **The welcome:** the island gets ready all day (the band tunes, the banner goes up, the gift shop opens); at 6pm the ship arrives, the harbourmaster runs up the yellow quarantine flag, and the band plays the welcome anyway to nobody | A parcel for G. Goose (on the tender boat); a coconut with a face |

## Cast
On the clock (`day.js`), walking room to room and riding the lift:
- **Inspector Pidge**, on holiday: a Hawaiian shirt under the trench coat, a notebook, a sun hat. Interviews the wrong people all day (the butter swan, the magician's hat, the roulette wheel) and runs the accusations.
- **Doreen** (a retiree in a cardigan and visor, a plate always), **Chad** (a spring breaker, a Green Mermaid in each hand, then carried), **Gloria** (a spa robe and a green face mask until 11am, then very pink), **Captain Stubbs** (white uniform, green face, bucket), **Chef Gaston** (a tall hat, a carving knife), **Tyler** (eight, a propeller cap, green hands after 10am).
- **Brenda and Ray**, in cabin 7. **Kelly**, the cruise director, relentless, a megaphone, runs the drill, the limbo and bingo. **Dr. Swabb**, the ship's doctor. **The stewards** who carry Chad. **The magician**.
- **The iguana**, green, on a sun lounger by the pool, sunglasses, a Green Mermaid; at the reveal, under a towel.
- **The goose**, a passenger: in a life jacket at the lifeboat drill, the only one listening.
- **The crowd:** passengers on every passenger deck, getting greener; crew below, not.

## Palette and plate
A holiday brochure printed on the sea. The paper is the sea and it follows the day: turquoise in the morning, bright at noon, gold into pink at 6pm when the ship docks. The picture runs to every edge (the sea bleeds, like Plum Island), and the page and the browser's bars follow the sea.

Draft inks:
- Sea `#2A93A8` (the paper at noon)
- Hull white `#F4EEE2`
- Funnel red `#D6473A`
- Sun yellow `#F2BF4A`
- Flamingo `#EE8C98`
- Teak `#B97A4A`
- Queasy green `#A7C23C`
- Paper `#2A93A8`

**Queasy green is the level's clue color.** Only the sick, the iguana and the red herrings (Gloria's mask, the Green Mermaids, the slime, the captain) wear it, so the eye can hunt for it. Plants and anything else green use a leaf green from `C`, never it.

## Alive
- **The day,** a four-minute loop from 7am to 7pm (20 seconds an hour): the buffet opens (7am), the casino opens (9am), the lifeboat drill (10am), Chad carried home (11am), the limbo (noon), the salad bar taped off (1pm), bingo (3pm), the crew party (3pm), the port in sight (5pm), docking and the yellow flag (6pm), the sunset (6 to 7pm).
- **People going green,** each at their own time, deck by deck from the Promenade upward. Their faces go queasy green over a few seconds and stay green till the loop starts again.
- **The ship:** a wake behind the stern, the funnel smoking, flags snapping, the sea's surface lapping at the hull, spray at the bow, gulls. At 6pm it slows and the wake fades.
- **Sound:** a sea bed (hull wash, gulls), the ship's horn at 7am and at docking, the drill's alarm (seven short, one long), the band tuning on the island, the dinner gong. Measured under the honk (`loudness()`).

## Mechanic
**Watch who goes green, and when.** Everyone turns green at their own time, and the dial (the ship's clock, from Plum Island's tide dial) skips to the day's moments: breakfast, the drill, noon, bingo, docking. Scrub back to 7am and the only green things aboard are the red herrings and the iguana. The crew never turn.

## Finds
17 evidence (the case file names them), 11 curiosities, and the goose. Labels are placeholders to settle at the greybox (sentence case, unique, no captions that give the answer).

| Area | Evidence | Curiosities |
| --- | --- | --- |
| The Waterslide | A patch of shed skin | A flip-flop on the funnel |
| The Pool | Chad's bar tab | A lounger reserved since day one; the goose |
| The Bridge | A bucket by the wheel; A box of seasickness patches; A camera still from 6:52am | |
| The Cabins | A bucket outside cabin 12; A nibbled flower garland | A towel monkey |
| Adults Only | Gloria's spa card | A "Do not disturb" sign on a hot tub |
| The Theater | A slime kit | A rabbit in a lifebuoy |
| The Buffet | Doreen's tongs; A queue ticket; Claw prints in the butter; A shrimp on a toothpick | |
| The Casino | The gangway clicker; Green handprints on a slot machine | |
| The Engine Room | | A hammock between two pipes; An engineer's lost wrench |
| The Crew Bar | A box of plastic shrimp | A disco ball made of spoons |
| The Sick Bay | The doctor's lab slip | A thermometer in a pudding |
| The Port | | A parcel for G. Goose; A coconut with a face |

## Shared universe
- **The goose:** at the lifeboat drill in a life jacket, the only passenger listening. A curiosity, not the culprit.
- **Inspector Pidge:** on holiday, investigating anyway.
- **The Courier:** on the tender boat with a parcel for "G. Goose, MS Bottomless", circling all day, never allowed alongside. The parcel is a pair of armbands.
- **Gander Cola:** at the pool bar and in the crew bar's fridge.
- **"Have you seen this goose?"** on the crew notice board.
- **The Block Party:** the magician is the Great Gary from the Walk-Up and the Block, on a cruise contract now.

## Tone
Dark comedy about a ship-wide stomach bug: green faces, buckets, queues, tape across the salad bar, a doctor losing it. **Nobody is ever shown being sick**: the joke is the buckets, the faces and the denial. Adult jokes in the margins (the divorce in cabin 7, the adults-only deck, the casino at 9am, the crew party). No real cruise line's name, livery or logo.

## Engine and kit needs
All of it exists; nothing new is built for this level (Boston owns engine changes this round).
- [x] **Storeys and the lift** (the Manor): four decks, the elevator panel (`lift` colors in the map).
- [x] **Walls down** and doors (`R.walls`, `cutaway.walls`), zones wider than 16 (`size`, E5).
- [x] **Walkers on one clock** (`schedule()`), including riding the lift (a move straight up).
- [x] **The whodunit format** (`game/case.js`), with this level's own case file and portraits.
- [x] **A place's own dial** (`map.dial`, from Plum Island's tide): the ship's clock and its skips.
- [x] **A plate that follows the clock** (`plate.at(t)`) and a sea that bleeds (`plate.bleed`).
- [ ] **The sea in front of the hull:** drawn by the level (its `sky`), not the engine: a see-through band of the sea's ink over the crew deck, cleared when you step in (`fx.focus`).

## The art (session 7)

Twelve areas and the cast, each drawn by an artist in its own worktree (four at a time on the owner's Mac, while the Boston session built Moving Day), then one art direction pass, full QA, frame rates on the owner's laptop, and a blind playtest. What's in each area is in its file's header and blurb; the highlights:

- **The Buffet:** the rush at 7am, the "NOW SERVING" board climbing all day past everyone aboard, the salad bar taped off at 1pm with people reaching under the tape, the butter swan slumping an hour at a time, buckets turning up by the green.
- **The Pool:** loungers reserved all day and nobody on them, the drill at 10 with only the goose listening (in its life jacket), the limbo at noon, the iguana on its lounger in sunglasses.
- **The Waterslide:** the big man stuck in the corkscrew, poked out with a pool noodle, a minute a go; the funnel with the ship's crest (a knife and fork).
- **The Bridge:** the green captain and the first officer steering with one finger, the couple doing the pose on the bow through spray and a gull, the CCTV bank showing the other decks' gags live.
- **The Cabins:** cabin 7 throwing Ray's things into the corridor an hour at a time with an audience on folding chairs, towel animals getting grander down the corridor.
- **Adults Only:** the attendant's SHHH! going round the deck an hour at a time; the hot tub couple who haven't moved in four days.
- **The Theater:** the Great Gary pulling everything but a rabbit out of his hat (a pigeon at 9am, when Pidge says to search it), the kids' slime show, bingo at 3.
- **The Casino:** the 8:59 queue with cups of coins; the man betting on green since day one, who wins at 6pm and faints.
- **The Engine Room:** the chief asleep in the hammock through every alarm, the gauge in the red.
- **The Crew Bar:** the better party, building all day and going off at 3pm; the waiter who drops his smile down here.
- **The Sick Bay:** DAYS WITHOUT AN OUTBREAK: 0, changed back by Dr. Swabb every time (it climbs while he's up at the buffet).
- **The Port:** the island getting ready all day, the yellow flag at 6pm, the band playing the welcome to nobody; the Courier's tender waved off at the pier every time.
- **The cast:** Pidge in a Hawaiian shirt under the trench coat; Doreen and her plate; Chad carried home by two stewards, still toasting; Gloria's cucumber mask; the captain's green face; the iguana, which walks, bobs its head, wears sunglasses on its lounger and, once the case is solved, a towel.

**Checks.** `npm run qa -- cruise` passes (14 passed, 0 failed; speed within budget, slowest the Pool at 52 ms, the Cabins and Adults Only also over 40). `npm run smoke` passes, with a new check that opens the ship. On the owner's 2017 laptop (`node tools/fps.mjs cruise`, 1440 x 800 at 2x): the whole ship 40 frames a second; the areas 20 to 33 (the Pool 20, the Cabins 23, the Buffet and the Crew Bar and the Port 24, the Casino 26, the Sick Bay 27, the Engine Room 28, the Bridge 29, the Waterslide and Adults Only 30, the Theater 33): level with Plum Island (12 to 21) and the Block Party's Main Street (18 to 20). The map is the biggest download so far (614 KB, 194 KB gzipped).

**The blind playtest:** 25 of 29 found, and the story held together (the tester suspected a reptile from the claw prints and the shed skin, was sure once the mystery card listed them, and laughed at Doreen's "number 2" and "Somebody put a towel on that lizard!"). Fixed after it, and re-checked by a second fresh tester: decisions 31 to 36.

## The pinched-in tour (session 7b)
Moving Day reached the owner with broken drawing that only showed pinched in (decision 39 there), so before the ship goes back, every area was toured the same way: `node tools/tour.mjs`, 3x on a phone, at six moments (7:15am, 10am, noon, 3pm, 5:30pm, 6:15pm), every tile looked at, by six reviewers two areas each, then the lead on everything shared. Over a hundred things fixed, none of them a find moved more than half a unit (the goose and the flip-flop on the funnel nudged with the funnel). The highlights:

- **People and their seats:** sitters on benches, stools, tins, crates and loungers drawn after their seats (the sick bay's bench sitters were hidden behind its back; the engine room's cook was inside his stool); people standing in hammocks, tables, cans and each other moved; Tyler on a beanbag in the theater's front row (the seat backs hid him); Chad sleeps on his bed, not half under it.
- **Walks:** the buffet's walkers kept off the hot counters, the salad bar and the swan's plinth; Gloria's pool chair moved off the walkway in front of the pool (the iguana and Pidge walked through it); Kelly calls the limbo from behind the bar and Pidge lies clear of the contestants; the pool's waiter, warden, drill passers and mop kept off each other and the furniture; the waterslide's lifeguard round his chair, not through it.
- **Greybox left over:** the lifeboats (a pointed hull, a band, a canopy with windows; one shared `lifeboat()` in `ship.js` now), the crew's laundry carts, the piano, the officers' deck chairs, the ship's bell.
- **Words and bubbles:** the SHHH! at Adults Only clear of every face it hushes, the captain's bubbles off the monitor officer, the carvery's heat lamp off Chef Gaston's face, the sanitizer sign the right way up, the casino's ALL ASHORE sign off the security officer's face.
- **The pools** (the Pool and the Waterslide's splash pool) draw only what you'd see through their opening, so their near edge, "3 FT" and the people in front show.
- **Shared:** the waterline steps aside with the sea when you're on the crew deck (it ran across every room down there); the wake is two wavy trails of foam (pinched in, its short dashes and ovals read as a stick floating off the stern); the sea's glints are little waves; a lying person's name tag sits on them; a sleeper's z rises from the head (every place); the ship's clock moves to the other corner from the lift on a phone (it was hidden under it on the overview).
- **Kept:** the red band a crew room's slab shows along its neighbor when you step in is the cut side of the floor, the same as every place's cutaway; without it the cut neighbor left a hole.

**Checks.** `npm run qa -- cruise`: 13 passed, 0 failed but speed, which in the cloud read the Pool at 66 ms. Back to back with the code before this session, the Pool times the same (30 to 40 ms against 35); Adults Only is about 7 ms slower (about 39, from its SHHH! and zen stones becoming separate things), the Crew Bar about 3; all under 60. `npm run smoke` passes (103 checks, two new ones for the clock and the lift). Frames a second on the owner's laptop not re-measured: `npm run qa -- cruise` and `node tools/fps.mjs cruise --only=adults-only,crew-bar,pool` there are the check.

## For the owner at gate 3
Answered (decisions 41 to 47): every recommendation taken, and it ships.


1. **The name is written All-You-Can-Eat** (decision 18): QA keeps a place's name to three words. Recommendation: keep it; the other way is to let QA allow this one name.
2. **It opens on the Promenade,** the two decks above hovering faint, the buffet in the middle (decision 6). The picker card shows the whole ship from the top. Recommendation: keep; the other choice is opening on the Sun Deck, which shows the whole ship but puts the buffet two decks down.
3. **The iguana is in plain sight all day** (on its lounger at the pool, walking the ship at breakfast and dinner). The playtester suspected a reptile during the hunt. Recommendation: keep; naming it still takes all six clues, and it sunbathing in plain view is the joke.
4. **A ship's horn** (the game has none; the port uses the car horn this round, decision 30). Recommendation: add one the next time this level can change `src/game/`.
5. **Three quieter stretches** the art director noticed (the Bridge's stern half, the back of the Cabins corridor, the Crew Bar's front before 3pm). None hides a find. The tour filled the first (a shuffleboard court, the officers' own, taken over by a retired couple). Recommendation: a small density pass after you've played it, if the other two read empty to you.
6. **The port is small on a phone** (the tour noticed): stepped into it, the island fills under half the screen's width, with sea all round. Recommendation: keep; it's an island in the sea, and pinching in works. The other choice is framing it tighter.

## Open questions
See "For the owner at gate 3".

## The greybox (gate 2)

Open it at `#/cruise` (hidden from the picker). `npm run qa -- cruise --quick` passes clean (11 passed, no warnings).

- **The plan** is `src/maps/cruise/plan.js`: the four decks on the Manor's storeys, the areas' sizes, the doors along the corridor, the lift shaft (x 18.4 to 21.6 on every deck, against the far side), the bow's taper, the waterline.
- **The ship's kit** is `src/maps/cruise/ship.js`: `deck()` lays every area's floor (tapered at the bow), the hull's slab along the cut side (red under the crew deck), its walls with the plan's doors (the far side angling in at the bow is drawn in pieces, since the engine's walls are straight), the lift's doors (a lift house on the Sun Deck), and a `lifeboat()`.
- **The day** is `src/maps/cruise/day.js`: thirteen people on the clock, riding the lift between decks (nobody's drawn inside the shaft). The style sheet has the day's clock (`at(h)`, `clockLabel`), its moments (the dial's skips), the sea's color through the day, and who's green when (`SICK`, `HERRING`, `sickness(id, t)`, `queasy(skin, k)`).
- **The case file** is `src/maps/cruise/case.js`, with portraits in portholes.
- **The sea** is `src/maps/cruise/ambient.js`: the wake (it fades as the ship slows into port), glints, gulls, the waterline, and the sea over the crew deck, lifted when you step down there.

## Decisions
Gate 1, the brief (the lead's calls, Sept 2026; the owner reviews them at the preview):
1. **The id is `cruise`,** the name **All You Can Eat**, the subtitle **Day Four** (under the name on its picker card, like Plum Island's "King Tide"). The ship is the *MS Bottomless*.
2. **A whodunit, and the culprit is not the goose:** it's a stowaway iguana (manor.md 2: later mysteries need a different culprit). Reptiles really do carry salmonella, so the solution is fair and the lab slip can say so.
3. **Six suspects, all green for the wrong reason,** and the culprit's card is "Someone else?" / "Not on the manifest", which ties to the gangway clicker (2,401 aboard, 2,400 on the manifest).
4. **Seventeen evidence finds,** like the Manor (six against the iguana, eleven for the suspects), plus eleven curiosities and the goose. Every piece of evidence hidden among look-alikes at its real size (manor.md 28), from the start this time.
5. **Four decks on the Manor's storeys,** changed from the lift, drawn as the ship's elevator panel (SUN DECK, CABINS, PROMENADE, CREW ONLY). Why not all four decks spread apart like the Walk-Up: the ship would stop reading as a ship. Stacked, it's a ship; the lift and the cut side show every deck.
6. **It opens on the Promenade** (the buffet, where it started), the two decks above lifted and hovering faint, the crew deck below through the cut side. The invitation: "Start at the buffet", pinned over the salad bar.
7. **The ship runs on the diagonal, stern top left, bow bottom right,** cut open along the side facing us, 80 units long and 16 wide, the bow tapering from x 64.
8. **The paper is the sea** and follows the day (turquoise, bright, gold into pink), bleeding to every edge like Plum Island. No land, no tide: the sea is flat, drawn by the level (the waterline, the wake, the sea over the crew deck), so the ship's zones stay plain rooms.
9. **The port is one outdoor area in the front corner,** fixed (it doesn't lift with the decks), drawn as a little island on the sea, not with the terrain engine: one island doesn't need a land, and a land would change how every deck's zones stand.
10. **A 180-second day, 7am to 7pm,** 15 seconds an hour, looping back to breakfast. The dial is the ship's clock ("9:40 AM"), and a tap skips to the next moment: breakfast, the drill, noon, bingo, docking.
11. **Green spreads by the clock,** each person at their own time, from the Promenade up; the crew never turn. It's in the style sheet (`green(t, at)`), so every artist uses the same rule.
12. **Queasy green is kept for the clue:** only the sick, the iguana and the red herrings wear it; plants use `C.leaf`.
13. **Nobody is shown being sick.** Buckets, faces, tape and queues.
14. **The lift and a stair tower sit in the same place on every deck** (x 22 to 26, against the far wall), so people ride between decks on the clock and the decks read as one ship.
15. **Pidge runs the accusations** (on holiday). The Courier is on the tender boat that's never allowed alongside; the parcel is a pair of armbands.
16. **This session's order:** the brief, the greybox, then as much of the art as the session allows, one PR; measuring (QA, fps, playtest) takes turns with the Boston session.

Gate 2, the greybox (the lead's calls, Sept 2026; the owner reviews them at the preview):
17. **The day is four minutes, not three:** 20 seconds an hour. The ship is 80 units long, and at a walk people couldn't get from the Sun Deck to the Promenade and back inside an hour of the day. People walk a little quicker than at the Manor (1.6 a second).
18. **The name is written All-You-Can-Eat** in the game. QA keeps a place's name to three words, and the hyphens are how the phrase is spelled anyway.
19. **The port moved off the far side, ahead of the ship** (to the right of it on screen). Off the cut side it drew over the engine room when you stepped in (the lower hull reaches down the screen in front of the ship), and ahead of the bow it sat under the lift panel. It's where the picture was emptiest.
20. **Lifted decks hover faint** (lift 14, ghost 0.09): an exploded drawing of the ship on the overview, quiet enough not to crowd an area you've stepped into.
21. **The waterline is just under the Promenade** (z -0.6), so the whole crew deck is under the sea, seen through its ink.
22. **One lift, no stairs** between decks: people step into its doors on one deck and out on another. The stair tower in the brief is scenery for the art.
23. **The bow tapers on every deck from x 64,** so the Bridge, Adults Only, the Casino and the Sick Bay each end in the point; their far walls angle in with it.
24. **Pidge's day:** the buffet (the butter swan), the theater (the magician's hat), the pool at noon (he tries the limbo), the bridge at 2pm, back to the buffet, green by 4pm. The sick bay was too far to fit.
25. **Gloria starts the day at the buffet** (7am, in her mask), is back in the spa by 8, pink at 11, at the pool all afternoon, and back to the buffet for dinner.
26. **Chad sleeps in cabin 12** (the stern end of the corridor is the honeymoon suite; cabins run 1 to 12 toward the bow), carried there at 11 by a steward, back at the pool bar by 5.
27. **Labels:** "A sign hung on a hot tub" (QA read "A Do Not Disturb sign" as Title Case); the invitation's hint is "Find where it began. Name patient zero." (short enough for its card on a phone).

The art (session 7, the lead's calls):
28. **Every area starts on a multiple of 16, on every deck** (the stern areas 0 to 16, the middle 16 to 48, the bow 48 to 80; the Cabins 0 to 48). The engine draws a deck in 16-unit chunks from each area's corner and sorts chunks by where they start, so boundaries at 24 and 56 put a piece of the deck below after the deck above it and the Cabins' walls showed through the Sun Deck (the Pool's artist caught it). Now each piece of a deck comes after the piece under it. The Theater, the Engine Room and the Waterslide are 16 wide; the Bridge, the Casino and the Sick Bay 32. The lift moved to x 12 so it stays in the stern areas.
29. **On the Sun Deck people walk round the pool,** behind it (y 4) or in front (y 11.8), never across the water.
30. **The ship's sound is built from sounds the game already has** (the sea is the surf bed; the drill is seven bells and the bridge bell; bingo is the ding; the port's welcome is the fanfare). A ship's horn is for a round when this level can change `src/game/`.
31. **The art director cut the repeats:** a second sunbather, a second Gander Cola cooler, a third pink towel; a second "stowaway" in a lifeboat (he's hiding from his in-laws now, so the clicker's 2,401 has one answer); the Buffet's board no longer stops at 2,401 (the clicker is the one place that says it). Helpers two or more areas drew went into `kit.js` (drawing on upright faces and the bow wall, lettering, inked lines, a person's hand).
32. **After the blind playtest:** Gloria's name is printed on her spa card (the tester couldn't tell it from the others); the towel monkey is drawn half as big again (it read as a swan); the patches box says SEASICK 500; the captain no longer carries a bucket (it took taps from the one by the wheel, which is the evidence), and the ice bucket moved from the wheel to the queue for the pose; the hammock's tap sits on the middle of its canvas.
33. **"Doreen's tongs" is "Tongs with a pink scrunchie":** Doreen leaves the buffet at 8:40am, so most players never see her there to know which tongs are hers. The case file still says whose they are.
34. **No name tag over the iguana:** it's patient zero, and "An iguana" over its head said so.
35. **Two stewards carry Chad** (the cast artist drew a second under him; the brief always said "the stewards").
36. **Two small fixes outside the level,** in their own commit: the case file said "It's in the The Buffet" for areas whose names start with The; the case-closed card said "things in the house" on a ship (a map can now say where, `words.inside`; the Manor reads as before).

The pinched-in tour (session 7b, the lead's calls):
37. **Every area toured pinched in at six moments before gate 3,** as Moving Day's decision 39 set; the owner's review is for taste.
38. **One lifeboat for the ship,** in `ship.js` (the Bridge's reviewer drew it; the kit's was a block). `rope: false` leaves its side clear for a name.
39. **On the crew deck the waterline lifts with the sea's ink;** the slab's cut side along a neighbor stays (it's the cutaway).
40. **Gloria's pool chair is at (29.5, 13.4),** in the gap in the lounger row, off the walkway; Kelly calls the limbo from behind the bar (27, 5.4); Pidge lies past its far stand (26.2, 9.7), his line after hers.

Gate 3 (the owner, Oct 2026, every recommendation taken):
41. **The name stays All-You-Can-Eat,** hyphens and all.
42. **It opens on the Promenade,** the buffet in the middle.
43. **The iguana stays in plain sight all day.**
44. **The ship has its own horn** (`shiphorn` in `src/game/audio.js`): one long, deep blast and a short one, two notes a fifth apart, as it comes into port at 5:48pm. About 6 dB under a honk (the level of Moving Day's jets) and far from its pitch.
45. **No density pass for now:** the tour filled the Bridge's stern half; the back of the Cabins corridor and the Crew Bar's front before 3pm wait for the owner to say they read empty.
46. **The port keeps its framing;** pinching in works.
47. **All-You-Can-Eat ships** in the picker after Moving Day, "Day Four" under its name.
