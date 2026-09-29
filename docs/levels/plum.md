# Plum Island

> Status: **Greybox (gate 2)** · Brief → Greybox → Art → QA → Preview → Shipped
> Owner approvals: brief [x] (session 5, every recommendation: decisions 1 to 6) · greybox [ ] · preview [ ]
>
> Built in session 5 with its engine piece, terrain and water (ROADMAP E4). Hidden until it ships: open it at `#/plum`. It lives in `src/maps/plum/`. The rough sketch it started from is in [the sketchbook](../sketchbook.html).

Plum Island replaces the Cape Cod beach (Low Tide) as the next level: same beach, same tide, moved to a real place. It's where terrain and water (E4) got built and proven.

## In one line
A summer day on a real barrier island, where the tide drains and floods the marsh on the clock, a king tide is coming tonight, and nobody is taking it seriously.

## The story
A light one, like the Block Party's: it runs across the map and never gets in the way of the geese.

**The setup.** A king tide is forecast for this evening. The refuge has put up signs, the town has put up signs, and everyone on the island has ignored them. Meanwhile **the Courier** has a parcel for "G. Goose, Plum Island" and one road to get it there. He knocks on every door in town all day, and at dusk he gives up and heads for the mainland, straight into the king tide.

**What the player does.** Find the goose and the things in each area. The tide decides what you can see: low water uncovers the flats and the creek beds, high water floats other things in. A dial in the corner says what the tide's doing, and a tap skips ahead to the next turn.

**The ending.** Find every goose and the king tide arrives: the water comes over the turnpike, the Courier's van stops in the middle of it, and the geese swim out to sign for the parcel. It's a pair of waders.

## Shape
- **Wide.** The island runs left to right: the Great Marsh and Plum Island Sound at the back, the island's dunes and houses in the middle, the Atlantic beach in front, the mouth of the Merrimack at the right-hand (north) end.
- **One piece of ground,** 108 units along the island by 64 across (`src/maps/plum/land.js`), cut like a diorama: the sea shows in section down the front edges. Areas are boxes of it; the ground runs on across them without a seam.
- **The connector:** the Plum Island Turnpike, the one low road across the marsh from the mainland (off the back edge) to the Center, over the bridge across the Plum Island River. Cars come and go on it all day; at the king tide, it goes under.
- **The hero:** the tide itself, and the marsh it floods. The landmark on the skyline is the lighthouse at the north end.
- **Silhouette:** a long sandbar: the island's curve, the river mouth and the jetty at one end, the marsh fraying into creeks behind.
- **Real geography** (compressed, never rearranged): the refuge (Parker River National Wildlife Refuge) covers the south end, the town the north end, where the turnpike lands. Behind the refuge is Plum Island Sound (flats and a channel); behind the town the Plum Island River and the Great Marsh, with the airfield north of the turnpike and the Pink House's lot south of it; the lighthouse, the Point and the south jetty at the north tip, at the Merrimack's mouth.

Where each area sits (world units; x along the island from the refuge, y from the marsh to the sea):

| | x 0 to 44 (the refuge) | x 44 to 80 (the town) | x 80 to 108 |
| --- | --- | --- | --- |
| y 0 to 22 (behind) | The Flats | The Turnpike | The North Point (the whole depth) |
| y 22 to 42 (the island) | The Refuge Dunes | The Center | |
| y 42 to 64 (the beach, the sea) | The Refuge Beach | The Front Beach | |

## Areas
Seven, each a box of the island's ground (E5, E4).

| Area | What's happening | Running gag (plays out over time) | Finds |
| --- | --- | --- | --- |
| **The Turnpike** | The causeway and the marsh along it: cars in and out, the clam shack by the road, the little airfield on the marsh, the Pink House's memorial sign | A car that drives through the flood every king tide. At high water it's there again, halfway, with the windows down | A goose and three things |
| **The Flats** | Plum Island Sound, behind the refuge: clammers at low water, kayaks at high, a sailboat that ran aground | The sailboat: aground at low tide with its owner sitting on the hull, afloat at high tide with its owner still on the hull | Low-tide and high-tide finds |
| **The Refuge Dunes** | Lot 1, the boardwalk over the dunes, the observation tower full of birders, greenhead fly traps in the marsh edge, a deer in the scrub | The birders swing every scope toward a rare bird. It's the goose. When they look, it's gone | A goose and three things |
| **The Refuge Beach** | The plover closure: a rope, a ranger, six birds with miles of beach, and everyone else on the open bit by the boardwalk | The ranger keeps moving the rope out a little, and the crowd on the other side keeps shuffling back | A goose and three things |
| **The Center** | Where the turnpike lands: the parking lot, beach stickers, houses in rows and on stilts, the beach path | The parking lot fills by noon; one car circles it all day | A goose and three things |
| **The Front Beach** | The town beach: the crowd, umbrellas, a lifeguard, surfers, a beach house that met the ocean | Greenheads: a swarm that chases one man up and down the beach | A low-tide find at the waterline |
| **The North Point** | The lighthouse and the playground across from it, the jetty with seals on it, lobster boats in the river, a sandbar the seals like | The seals take over more of the jetty as the tide drops, and the fisherman who was there first ends up on the last rock | A goose and three things |

## Cast
- **The Courier**, door to door in the Center and out to the Point all day, stuck on the turnpike at dusk.
- **Inspector Pidge**, among the birders on the tower, pointing wherever the goose was a moment ago.
- **The ranger**, moving the plover rope, a spare stake under one arm.
- **Every King Tide Dave**, who drives through the flood every time, and stalls halfway.
- **The birders**, the clammers, the lifeguard, the surfers, the sailboat's owner, the fisherman on the jetty, the man the greenheads chase, the sticker booth's attendant, the people photographing the Pink House's sign.
- **Animals** (light, before E6): plovers, gulls, seals, a deer, a heron, the greenheads. Simple movers, not a cast system.
- **The crowd:** beachgoers, day-trippers, families from the houses on stilts.

## Palette and plate
A sun-bleached summer plate, lighter and warmer than the Block. Draft inks for the art director to tune (`src/maps/plum/style.js`):

- Paper `#F4EAD5`: the sheet, and the sand in the sun
- Marsh `#9DB36B`: the Great Marsh and dune grass
- Sea `#3F8FA6`: the Sound, the river, the Atlantic, printed see-through over the ground, so the sand shows under the shallows and the deep bed shows dark
- Shallows `#8CCFC2`: water over the flats
- Sand `#E9CF98`: beaches and dunes (wet sand a shade darker, just above the water)
- Shingle `#A9A8A2`: houses, the jetty, the road
- Coral `#E3603F`: umbrellas, buoys, the lighthouse's lamp

Line ink stays the game's navy (`#252D52`). The plate follows the day (`plate.at(t)`): a warm dawn, bleached noon, gold at sunset, a deep blue evening for the king tide, navy at night. After dark the ground is printed in deeper, bluer inks (the same ground, faded in).

## Alive
- **The tide**, all day: the water level rises and falls, and the shoreline, the creeks and the flats move with it. Waves roll up the Atlantic beach to the water's edge; the sand stays dark for a while where the tide's just been.
- **Traffic on the turnpike**, and the king tide over it.
- **The beach** fills by mid-morning and empties as the tide comes back up it.
- **Boats**: lobster boats in and out of the river, kayaks on the Sound at high water (pulled up on the beach at low), a small plane round and round the airfield.
- **Birds**: plovers running at the waterline, a gull with a fry, a heron in the channel.
- **Greenheads**: a swarm that chases one man up and down the beach.
- **Sound bed:** surf (waves breaking and drawing back, a hiss of spray), gulls now and then on the clock. Wind in the grass and the plane are for the art pass.

## Mechanic
**The tide.** One a day, easier to read than the real two (decision 3), on a six-minute day from 5am: going out all morning, low water from 8:30am to 3:50pm (the flats out, the beach at its widest), coming in all afternoon, the king tide at 8:30pm, when it takes the turnpike (7:15 to 10:45pm), then draining away through the night (`src/maps/plum/tide.js`).

Some finds are there only at low tide or only at high tide, and one only at sunset. The list says when ("LOW TIDE" beside it), a hint for one that isn't there says so, and **the dial** skips ahead: tap it and the day runs fast for a second or two, the tide rushing in or out, and lands at the next turn (low tide at 12:30pm, high tide at 8pm).

## Finds
One goose and three things per area (28 in all). Finds on the tidal beach float, fly or get carried, so none go under. Pins in the greybox, numbered.

| Area | Finds |
| --- | --- |
| The Turnpike | The goose (in the clam shack's queue); a lobster crossing the road; a car key on a float *(high tide, in a creek)*; the Pink House, back for a moment *(sunset)* |
| The Flats | The goose (on the marsh island in the Sound; it swims at the king tide); a clammer's lost boot *(low tide)*; a message in a bottle *(low tide)*; a kayak paddle *(high tide)* |
| The Refuge Dunes | The goose (popping up in the dunes, never where the scopes point); a birder's lens cap; a deer in the dunes; a checklist, one bird crossed out |
| The Refuge Beach | The goose (inside the rope with the plovers); a kite inside the rope; the ranger's spare stake; a bucket of shells |
| The Center | The goose (on the roof of a house on stilts); a parking ticket; a beach sticker from 1998; a leash with no dog |
| The Front Beach | The goose (under an umbrella, on a towel it didn't bring); a buried cooler *(low tide)*; a stolen french fry; a boogie board |
| The North Point | The goose (on the playground's swings); a lobster buoy; a lure on the jetty *(low tide)*; a seal wearing sunglasses |

## Shared universe
- **The goose** in every area (and on the parcel).
- **The Courier**, the story's thread.
- **Inspector Pidge**, with the birders.
- **The fake brand** on the banner plane over the beach (its name is still open in LEVELS.md). For the art pass.
- **A "Have you seen this goose?" poster** on the clam shack. For the art pass.

## Tone
Affectionate and local. The erosion and the Pink House are real losses to real people: the jokes are about the people who ignore the tide, never about anyone losing a home. Greenheads and the plover closure are fair game. The Pink House's sign is shown as it is, with people stopping for the photo; its ghost is a nod to people who knew it, not a joke.

## Engine and kit needs
**E4, terrain and water**, built and proven on this level (session 5). See `src/engine/terrain.js`.

- [x] **Ground with height.** A land (`makeLand`) is heights on a half-unit grid over the whole map, with layers printed on it in turn (sand, the sea bed, mud, marsh, scrub, lawns, dune grass, the airstrip, roads), each the region where its field is above 0, traced like contour lines so the edges are smooth, and shaded where the ground turns away from the light. A map with a land gives it to every zone (`R.ground(x, y)`, walkers, taps, framing, cutaways); each area prints its part with `drawLand(R, land)`. The plate's front edges are cut, like a diorama.
- [x] **The one rule:** ground never climbs toward the viewer steeper than 0.8 a unit, so drawing it before what stands on it is always right. Steep things (the jetty, the bridge) are things. QA checks it (`steep(land)`).
- [x] **Water with a level.** Everything lower than `level(t)` is under a see-through sea ink, so the shoreline, the creeks and the flats move on their own; the ground's colors carry the depth. The water shows in section at the plate's cut edges.
- [x] **Waves and wet sand.** Lines of foam roll up the Atlantic beach (`surf`); the sand stays dark where the tide's just been.
- [x] **Floating things.** Boats, the buoy, the paddle, the key and the bucket of shells sit on the water (`float(x, y, t)`); people in water are drawn from the waterline up (`wade`).
- [x] **Finds with a window** (`when`, `note`): taps, pen loops, hints, the list and QA respect them.
- [x] **The dial** (`map.dial`): a place's own clock on screen, and a tap to skip ahead.
- [x] **Speed.** Each area's ground goes into its still-floor cache in one picture; each chunk draws its own water once a frame, traced again only when the level moves a step. QA's phone check: every view within budget (slowest the North Point, 43 to 48 ms against 60 across runs). The owner's 2017 laptop: 15 to 22 frames a second in the areas, the Block Party's streets 20 to 24 (both limited by the graphics chip).
- [x] **Smoke test and QA** cover the tide (ground and taps, low and high water, a low-tide find, the dial, the king tide at the end).

## Decisions

Gate 1 (the brief), from the owner at the start of session 5: **every recommendation**, and no additions for now.

1. **The Pink House:** the empty lot, the memorial sign (unveiled April 2026: an engraved sign on two granite posts, "never forgotten"), people stopping for the photo; at sunset the house shimmers back for half a minute, and tapping it then is a find.
2. **Its own map,** printed with the same inks Newburyport will use, so the two read as a pair later.
3. **Geese plus the light story** (the Courier racing the king tide); **one tide in a six-minute loop**, low at midday, the king tide in the evening; **July**; **waders** in the parcel; called **Plum Island**; the clam shack a lookalike with no name.
4. **Tide-only finds stay fair with a tide clock you can skip:** "at low tide" beside them in the list, and a tap on the clock jumps ahead to the next low or high water.
5. **The refuge beach is closed in July** (April to August, for the plovers), except a short stretch by the Lot 1 boardwalk: so the gag is everyone packed onto that stretch, and six plovers with the rest.
6. **No owner ideas added yet;** they can come at the greybox.

The greybox (session 5), for the owner's gate 2:

7. **One piece of ground for the whole map** (108 x 64 units, a half-unit grid), areas as boxes of it that sit at the map's corner, so area files work in the land's own units (like the Block Party's streets).
8. **Heights:** the dunes 2.75 in the refuge (hummocks), 2.05 in town; the island's top 1 to 1.15; the marsh 0.45; the turnpike's crown 0.65 on a low causeway; the beach from 0.95 at the dune toe down 0.15 a unit; the deep sea bed -2.6; the plate's cut sides to -3.2.
9. **The tide:** -0.9 at low water, 0.8 at the king tide. The beach is about 12 units wide at noon and gone to the dunes at the king tide; the marsh floods from about 6:45pm.
10. **Low-tide finds** show while the level is under -0.6, **high-tide ones** over 0.2, **the Pink House** 7:30 to 9:30pm. The dial lands at 12:30pm (low) and 8pm (high, which is also sunset).
11. **Everything on the tidal beach floats, flies or is carried** (the kite replaces the sandcastle, a bucket of shells the shell collection), since the whole beach goes under at the king tide.
12. **People on the clock (5):** the Courier's van (over the bridge at 7am, parked at the Center, out at 7:25pm and stuck in the flood till 10:50pm), the Courier on foot (every door in the Center, the lighthouse, the lifeguard), Every King Tide Dave (in at 8pm, stalled halfway, windows down), two cars of beach traffic (the lot's full, so they park on the boulevard). Everyone else stays in their area.
13. **The first screen** points at the town beach: "King tide tonight. A goose on every stretch. Step in." On a phone the overview frames the town, its beach and the turnpike, and the island runs off the sides.
14. **The dial** sits under the tallies, or in the thumb corner on a phone's overview.
15. **The ending:** the clock jumps to 8:30pm, the camera to the turnpike, and the geese swim out across the flooded marsh and round the van; the Courier, on its roof: "G. Goose?", "Sign here.", "Waders."

## Open questions (for gate 2)
With a recommendation for each.

1. **The tide's size.** The beach goes from about 12 units at noon to nothing at the king tide. *Recommend:* keep it: the king tide is the story, and the beach at noon is the busiest picture.
2. **The shape.** Seven areas on a 108 x 64 plate; the Flats and the Refuge Beach are the biggest and emptiest. *Recommend:* keep the layout; the art fills the Sound's flats and the closed beach with the jokes about emptiness (six plovers, miles of sand).
3. **Check the real map** before the art: the airfield north of the turnpike, the Pink House lot south of it, the clam shack at the mainland end, Lot 1 and its boardwalk at the refuge's north end, the lighthouse set back at the Point, the south jetty. *Recommend:* the lead checks each against a map at the start of the art session.
4. **The ghost's window** is half a minute a loop (QA warns). *Recommend:* keep it short: it's a bonus for people who know, and the dial's high tide lands in it.
5. **The owner's own ideas** go here.
