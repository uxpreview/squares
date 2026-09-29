# Plum Island

> Status: **Brief (draft)** · Brief → Greybox → Art → QA → Preview → Shipped
> Owner approvals: brief [ ] · greybox [ ] · preview [ ]
>
> A first draft from the sketchbook session (Sept 2026), before the owner's own ideas. Next: the owner adds their ideas, answers the open questions, and approves. Nothing gets built until then. The rough sketch is in [the sketchbook](../sketchbook.html) (open it in a browser; drag the tide).

Plum Island replaces the Cape Cod beach (Low Tide) as the next level: same beach, same tide, moved to a real place. It's where terrain and water (E4) get built and proven.

## In one line
A summer day on a real barrier island, where the tide drains and floods the marsh on the clock, a king tide is coming tonight, and nobody is taking it seriously.

## The story
A light one, like the Block Party's: it runs across the map and never gets in the way of the geese.

**The setup.** A king tide is forecast for this evening. The refuge has put up signs, the town has put up signs, and everyone on the island has ignored them. Meanwhile **the Courier** has a parcel for "G. Goose, Plum Island" and one road to get it there.

**What the player does.** Find the goose and the things in each area. The tide decides what you can see: low water uncovers the flats and the creek beds, high water floats other things in.

**The ending.** Find every goose and the king tide arrives: the water comes over the turnpike, the Courier's van stops in the middle of it, and the geese swim out to sign for the parcel. (What's in it is open question 7.)

## Shape
- **Wide.** The island runs left to right: the Great Marsh and Plum Island Sound at the back, the island's dunes and houses in the middle, the Atlantic beach in front, the mouth of the Merrimack at the right-hand (north) end.
- **The connector:** the Plum Island Turnpike, the one low road across the marsh from the mainland to the island. Cars come and go on it all day; at the king tide, it goes under.
- **The hero:** the tide itself, and the marsh it floods. The landmark on the skyline is the lighthouse at the north end.
- **Silhouette:** a long sandbar, not a square: the island's curve, the river mouth and the jetty at one end, the marsh fraying into creeks behind.
- **Real geography** (compressed, never rearranged): the refuge (Parker River National Wildlife Refuge) covers most of the island, the south end; the town part (the Center, the houses, the lighthouse) is at the north end, where the turnpike lands. Check every placement against a real map at the greybox.

## Areas
Seven, each one area of any shape (E5).

| Area | What's happening | Running gag (plays out over time) | Finds |
| --- | --- | --- | --- |
| **The Turnpike** | The causeway and the marsh along it: cars in and out, the clam shack by the road, the little airfield on the marsh, the Pink House's memorial (open question 1) | A car that drives through the flood every king tide. At high water it's there again, halfway, with the windows down | A goose and three things |
| **The Flats** | Plum Island Sound, behind the island: clammers at low water, kayaks at high, a sailboat that ran aground | The sailboat: aground at low tide with its owner sitting on the hull, afloat at high tide with its owner still on the hull | Low-tide and high-tide finds |
| **The Refuge Dunes** | The boardwalk, the observation tower full of birders, greenhead fly traps in the marsh edge, a deer in the grass | The birders swing every scope toward a rare bird. It's the goose. When they look, it's gone | A goose and three things |
| **The Refuge Beach** | The plover closure: a rope, a ranger, six birds with miles of beach | The ranger keeps moving the rope out a little, and the crowd on the other side keeps shuffling back | A goose and three things |
| **The Center** | Where the turnpike lands: the parking lot, beach stickers, houses on stilts, the beach access path | The parking lot fills by noon; one car circles it all day | A goose and three things |
| **The Front Beach** | The town beach: the crowd, umbrellas, a lifeguard, surfers, a beach house that met the ocean | Greenheads: a swarm that chases one person up and down the beach | Low-tide finds at the waterline |
| **The North Point** | The lighthouse and the playground across from it, the jetty with seals on it, lobster boats in the river | The seals take over more of the jetty as the tide drops, and the fisherman who was there first ends up on the last rock | A goose and three things |

## Cast
- **The Courier**, racing the tide with the parcel, stuck on the turnpike at the end.
- **Inspector Pidge**, among the birders with a borrowed scope, sure a plover is the goose.
- **The ranger**, moving the plover rope.
- **Every King Tide Dave** (working name), who drives through the flood every time.
- **The birders**, the clammers, the lifeguard, the surfers, the sailboat's owner, the fisherman on the jetty.
- **Animals** (light, before E6): plovers, gulls, seals, a deer, the greenheads. They're simple movers, not a cast system; the zoo and the Mara need the real thing later.
- **The crowd:** beachgoers, day-trippers, families from the houses on stilts.

## Palette and plate
A sun-bleached summer plate, lighter and warmer than the Block. Draft inks for the art director to tune:

- Paper `#F4EAD5`: the sheet, and the sand in the sun
- Marsh `#9DB36B`: the Great Marsh and dune grass
- Sea `#3F8FA6`: the Sound, the river, the Atlantic
- Shallows `#8CCFC2`: water over the flats
- Sand `#E9CF98`: beaches and dunes (wet sand a shade darker)
- Shingle `#A9A8A2`: houses, the jetty, the road
- Coral `#E3603F`: umbrellas, buoys, the lighthouse's lamp

Line ink stays the game's navy (`#252D52`). The plate follows the day (the Block Party's `plate.at(t)`): bright at noon, gold at sunset, and a deep blue evening for the king tide.

## Alive
- **The tide**, all day: the water level rises and falls, and the shoreline, the creeks and the flats move with it. Waves break along the Atlantic edge.
- **Traffic on the turnpike**, stopping when the road floods.
- **The beach** fills by noon and empties at sunset.
- **Boats**: lobster boats in and out of the river, kayaks on the Sound at high water, a small plane landing at the airfield.
- **Birds**: plovers running at the waterline, gulls stealing food, a heron in the creeks.
- **Greenheads**: a small swarm (particles) that follows people around.
- **Sound bed:** surf, gulls, wind in the grass, a distant plane.

## Mechanic
**The tide.** It runs on the day's clock. Going out, it drains the marsh and the flats and uncovers finds you can only see at low water; coming back, it covers them and floats other things in. The king tide at the end of the loop floods the road. Some finds are there only at low tide or only at high tide (open question 5 for how that stays fair).

## Finds
Draft labels, one goose and three things per area (28 in all). Tide-only finds are marked.

| Area | Finds |
| --- | --- |
| The Turnpike | The goose; a lobster crossing the road; a car key on a float *(high tide)*; the Pink House's old mailbox |
| The Flats | The goose; a clammer's lost boot *(low tide)*; a message in a bottle *(low tide)*; a kayak paddle *(high tide)* |
| The Refuge Dunes | The goose; a birder's lens cap; a deer in the dunes; a checklist with one bird crossed out |
| The Refuge Beach | The goose; a sandcastle inside the rope; the ranger's spare stake; a shell collection |
| The Center | The goose; a parking ticket; a beach sticker from 1998; a leash with no dog |
| The Front Beach | The goose; a buried cooler *(low tide)*; a stolen french fry; a boogie board |
| The North Point | The goose; a lobster buoy; a lure on the jetty *(low tide)*; a seal wearing sunglasses |

## Shared universe
- **The goose** in every area (and on the parcel).
- **The Courier**, the story's thread.
- **Inspector Pidge**, with the birders.
- **The fake brand** on the banner plane over the beach (its name is still open in LEVELS.md).
- **A "Have you seen this goose?" poster** on the clam shack.

## Tone
Affectionate and local. The erosion and the Pink House are real losses to real people: the jokes are about the people who ignore the tide, never about anyone losing a home. Greenheads and the plover closure are fair game.

## Engine and kit needs
The big one is **E4, terrain and water**, built and proven on this level. A plan for the build session to refine:

- [ ] **Ground with height.** Areas can carry a height field (marsh, dunes, beach, road), drawn in the chunks E5 already sorts, with side faces where ground steps down (dune edges, the jetty, the plate's edge).
- [ ] **Water with a level.** A water surface drawn at a level that changes with the clock; anything lower than the level is under water, so the shoreline, the creeks and the flats move on their own. Shallow and deep water drawn differently.
- [ ] **Waves and wet sand.** Breaking waves along the Atlantic edge; a darker wet band just above the waterline.
- [ ] **Floating things.** Boats, buoys and the high-tide finds sit on the water's level, not the ground's.
- [ ] **Finds with a window.** A find can be there only for part of the loop. The hint, the find list and QA's "every find on screen" checks all respect the window.
- [ ] **Speed.** The ground is cached per chunk and only the water redraws as the level moves. `node tools/fps.mjs` on the owner's 2017 laptop, against the Block Party's numbers.
- [ ] **Smoke test and QA** extended to cover the tide (a find at low tide, the same spot at high tide).

Already in the engine: areas of any shape (E5), a paper that changes with the clock (`plate.at(t)`), people on one clock walking paths (`schedule()`), vehicles on a route (the Block Party's traffic).

## Open questions
With a recommendation for each.

1. **The Pink House was demolished in March 2025.** It now has a memorial sign where it stood. *Recommend:* show the empty lot, the sign and people still stopping to photograph it, and let the house flicker back for one second at sunset as a find ("The Pink House, back for a moment"). Affectionate, and it rewards people who know.
2. **One map, or joined to Newburyport?** *Recommend:* its own map, printed with the same inks so the two read as a pair; join them later if it's worth it. The first E4 level shouldn't also be the first two-town map.
3. **Geese, or a whodunit?** *Recommend:* geese plus the light story (the Courier racing the king tide), like the Block Party. The Feast or Split could be the next whodunit.
4. **How long is the loop, and how many tides in it?** *Recommend:* about six minutes, one tide: low water around midday, the king tide in the evening at the end of the loop. Real tides come twice a day, but one is easier to read.
5. **How do tide-only finds stay fair?** *Recommend:* a small tide clock on screen, "at low tide" or "at high tide" beside those finds in the list, and a low-water window of at least two minutes per loop. The player can't control the tide.
6. **Which season?** *Recommend:* July: greenheads, the plover closure and a full beach, all real in July.
7. **What's in the Courier's parcel?** *Recommend:* a pair of waders.
8. **What's the level called in the picker?** *Recommend:* "Plum Island", since real places go by their real names, with "King Tide" as the card's subtitle.
9. **Real businesses.** *Recommend:* the clam shack on the causeway is a lookalike with no name; the refuge, the lighthouse, the turnpike and the airfield are named.
10. **The owner's own ideas** go here before approval.
