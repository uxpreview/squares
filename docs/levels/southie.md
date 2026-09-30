# Moving Day

> Status: **Preview** · Brief → Greybox → Art → QA → Preview → Shipped
> Approvals: brief [x] (the lead's call, session 6, decisions 1 to 24) · greybox [x] (the lead's call, session 6, decisions 25 to 31) · preview [ ] (the owner)
>
> Written in session 6 (Sept 2026) from the backlog entry in [LEVELS.md](../LEVELS.md) and the owner's sketch in [the sketchbook](../sketchbook.html) ("Southie: Moving Day"). Every landmark and street was checked against OpenStreetMap and the news to September 2026 before a line of it was written ("Real places, checked"). The owner reviews once, at the preview (PROCESS.md): at the brief and the greybox the lead takes its own recommendations and writes them into Decisions, where the owner can overturn any of them. The id is `southie` (`#/southie`), hidden until it ships.

The first of the three Boston places (decision 1). Replaces Wicked Pissah.

## In one line
September 1st in South Boston, when every lease turns over at once: a row of triple-deckers across from Marine Park, everyone out by noon and in by night, one truck, one rope, one couch, and a goose in every apartment.

## The story
A light one, like the Block Party's and Plum Island's: it runs across the map and never gets in the way of the geese. The goal is every goose (one per area); no whodunit.

**The setup.** It's Moving Day, the day most leases in Boston end and start. On Farragut Road the rule is the same in every house: out by noon, in after. The landlady on the first floor of the Green House has run this day for fifty-two years and has everyone's keys on one ring. Everyone else is improvising. It rains from ten till three.

**The day.** The trucks arrive at seven; one gets stuck by nine, between a parked car and a pickup, and stays stuck. The old tenants carry out, the curb fills with free furniture, the rain comes, the landlady inspects at noon and the keys change hands; then the new people carry in, the curb empties into one apartment in particular, the rain stops, the sun goes down behind Dorchester Heights, and every window on the street lights up on its first night. All day, a couch is on a rope halfway up the Green House.

**The Courier** has a parcel for "G. Goose, Third Floor, Farragut Road". Every house on Farragut Road has a third floor. He climbs all of them.

**What the player does.** Tap a house and it opens like a dollhouse: the front comes off and the floors above lift away, so you can see into the apartment you picked. Find the goose and the things in each apartment and outdoors. Moving Day decides some of what you can see: the old tenants' things are there before noon, the new tenants' after (the list says which, like Plum Island's tide finds). A small lease clock on screen says the time and skips to the next moment worth seeing.

**The ending.** Find every goose and the clock jumps to 9:30pm. The camera flies to the Green House's third floor, where the couch has hung on its rope all day. The geese haul it up, pivot it through the porch door ("PIVOT!"), and sit on it. The Courier makes it up the last flight with the parcel. It's packing tape. "Could've used that this morning." (The Courier's parcels always arrive right after you needed them: on Plum Island it was greenhead spray.)

## Shape
- **Wide, looking northwest from over the harbor** (decision 4). The map's x runs east (toward the lower right of the screen), y runs south (toward the lower left). So the shore runs straight across the bottom of the screen, the city climbs away behind it, Castle Island is at the right, and the sun sets at the back left, behind Dorchester Heights.
- **The hero: the row.** The west side of Farragut Road, a row of triple-deckers facing east across the road to Marine Park, three of them enterable (the Green House, the Yellow House, and the Grey One, gut-renovated into condos), with more of the row running on past them, not enterable, at both ends. Their fronts face the camera: porches stacked three high, bay windows, flat roofs, and on the overview they're closed houses you could recognize from the plane.
- **Why Farragut Road and not a lettered street** (decision 3): from the south, a house on a street with houses on both sides is hidden by the houses across the street. Farragut Road is the one street in City Point with a row of houses on one side and open park on the other, so you can see the whole row from the air, which is how every visitor to Marine Park sees it. The lettered streets run right behind it (P Street is the next one west).
- **In front of the row:** Farragut Road (parked both sides, the truck stuck in it), then Marine Park running down to Pleasure Bay: lawns, the Farragut statue on its circle at the end of East Broadway, the playground, the bath house on Pleasure Bay Beach.
- **To the right:** Day Boulevard runs out along Pleasure Bay's north shore to Castle Island: the parking lot, the hot dog stand and its line, Fort Independence, the McKay monument, with Conley Terminal's cranes behind. Planes landing at Logan come in low over Pleasure Bay.
- **At the back:** the rest of City Point's rooftops, the Seaport's towers (north-northwest), the port's cranes, and Dorchester Heights' white tower on the skyline at the far left, where the sun goes down.
- **Silhouette:** a row of tall, narrow, flat-roofed houses stepping along a diagonal street, the round lagoon, the pentagon fort on its island, a plane.
- **On a phone** held upright, the overview frames the row and the road at full height and the park and Castle Island run off to the right, a swipe away (as Plum Island and the Block Party's streets do). On its side, the whole map.
- **Real geography, compressed, never rearranged.** Farragut Road to Castle Island is about a kilometer; the park and the bay are squeezed hardest. Dorchester Heights (2.5 km west) is skyline only.

Draft plan in units (a person is 2.3 units tall, so a unit is about 2.5 feet). About 110 x 72; the greybox tunes it.

| y ↓ / x → | 0 to 19: the row | 19 to 33: Farragut Road | 33 to 70: Marine Park | 70 to 110: the bay and the island |
| --- | --- | --- | --- | --- |
| **0 to 12** (north) | the row carries on north (not enterable); the corner of East Broadway | the Broadway loop | the Farragut circle, Day Boulevard heading northeast | Day Boulevard's causeway along the bay; **Castle Island** (the lot, the stand, the fort) |
| **12 to 56** | **the Green House, the Yellow House, the Grey One** (north to south), a house's gap between each | **Farragut Road** | **Marine Park**: lawns, playground, picnic shelter, the bath house | **Pleasure Bay**, ringed by its walkway; the Head Island causeway to the Sugar Bowl |
| **56 to 72** (south) | the row's south end (not enterable), Columbia Road's corner | the bottom of Farragut Road, Day Boulevard | Pleasure Bay Beach | Dorchester Bay, the harbor, to the front edges |

Each triple-decker is about 9 wide (along the road) and 13 deep, plus its porches, with three floors of 4.4 units (13.2 to the roof). The areas tile the whole map, water included, so walkers, cars and boats are always inside one.

## Areas
Twelve: nine apartments in three houses, and three outdoors. Each apartment is its own area, stacked three high; the three outdoor ones are areas of any shape on the land (E5).

| Area | What's happening | Running gag (plays out over time) | Finds |
| --- | --- | --- | --- |
| **The Landlady** (Green House, 1st floor) | The owner, fifty-two years in the house, not moving. A plastic-covered couch, a police scanner, every key on one ring, a clipboard, the Red Sox on the radio. She runs the day from her front window | **The inspection:** at 11:30 she climbs to every apartment with her clipboard; at noon she hands out keys from the porch, one at a time, to a queue in the rain; by night she's back at the window, scanner on, narrating | A goose; the ring of spare keys; a coffee can of deposits; a police scanner |
| **The Roommates** (Green House, 2nd floor) | Before noon, four guys moving out: a futon, a beer pong table, a flag, a TV on a milk crate, the pizza boxes. After noon, a night-shift nurse moves in and goes straight to sleep through everything | **The deposit:** a poster over a hole in the wall; the landlady lifts it at 11:40; the deposit goes back in her coffee can | A goose; a ping-pong ball under the radiator *(before noon)*; the hole behind the poster *(before noon)*; a sleep mask *(after noon)* |
| **The Couch** (Green House, 3rd floor) | Before noon, the last tenant leaving everything ("It's all yours."). After noon, a couple from out of state moving in, measuring the stairwell, measuring it again | **The couch on the rope:** it doesn't fit the stairs, so it goes up the front on a rope from the porch at 9am and hangs halfway up for the rest of the day (the finale brings it in) | A goose; a tape measure; the couch's missing leg; a floor plan on a napkin *(after noon)* |
| **The Family** (Yellow House, 1st floor) | Before noon, a family moving out to the suburbs, the kids hiding in boxes, a height chart on the kitchen door frame. After noon, a retired couple moving in from the suburbs ("We sold the house in Braintree.") | **The hamster:** loose all morning, in a different box every time a lid opens; after noon the retired couple find it and keep it | A goose; a runaway hamster *(before noon)*; a crayon drawing of the house; a pair of reading glasses *(after noon)* |
| **The Overlap** (Yellow House, 2nd floor) | The old tenant hasn't finished leaving and the new one has arrived: two of everything, one apartment, a standoff at the kitchen table | **Noon:** the old tenant has one box left at 11:58, and it's the last box every time you look, until it's gone | A goose; a second toaster; a lease signed twice; the last box *(before noon)* |
| **Southie Christmas** (Yellow House, 3rd floor) | Empty before noon (the tenant's out on the street). After noon he furnishes the whole place from the curb, one free thing at a time | **The curb:** everything left on Farragut Road's curb in the morning is up here by evening, in the order it disappears from the street | A goose; a lamp with no shade *(after noon)*; a free TV *(after noon)*; a "FREE" sign |
| **The Open House** (the Grey One, 1st floor) | A gut-renovated condo, staged for a showing: fake lemons, a bowl nobody's allowed to use, a realtor, booties at the door. Twenty people at the 1pm showing, all measuring | **The booties:** everyone must wear them; the landlady walks through in her shoes | A goose; a plastic lemon; a realtor's name tag; a pair of shoe booties |
| **The New Owners** (the Grey One, 2nd floor) | The new owners: movers in matching shirts, an exercise bike with a screen, a smart fridge, a French bulldog in a stroller | **The bike:** carried up to the wrong floor, down, up again; by night its owner is riding it, looking at the harbor | A goose; a dog's rain boot; the bike's water bottle *(after noon)*; a smart speaker |
| **The Roof Deck** (the Grey One, 3rd floor) | The penthouse and its roof deck: a hot tub, a fire table, a view of Castle Island, a new owner's first day | **The planes:** every time one comes over, the wine glasses rattle and the conversation stops mid-word, then carries on | A goose; a wine glass on the railing; a golf umbrella; a pair of binoculars |
| **Farragut Road** | The street: parked both sides, the rental truck stuck between them and a honking queue behind it, "NO PARKING MOVING DAY" signs, the curb pile (couch, mattress, lamp, TV, "FREE"), the couch on its rope, a truck with its roof peeled open ("I took Storrow."), the Courier double-parked, iced coffees in the rain | **The truck:** in at 7am, stuck by 9; the queue honks; the parked car's owner comes back at noon, looks, and walks off; at 3pm six neighbors bounce the car sideways and the truck gets out, to applause | A goose; a mattress tag; a snapped-off side mirror; a lawn chair saving a space |
| **Marine Park** | Across the road: lawns, the Farragut statue on its circle at the end of East Broadway, the playground, the picnic shelter, the bath house on Pleasure Bay Beach, walkers on the Sugar Bowl loop. Neighbors watch the moves from lawn chairs | **The audience:** the lawn chairs fill up all morning, facing the row, scoring each move; they cheer the truck out at 3; a couch from the curb ends up on the lawn with three of them on it | A goose; a kite in a tree; a lost flip-flop; a scorecard |
| **Castle Island** | Day Boulevard's causeway along the bay to the parking lot, the hot dog stand and its line (a lookalike), Fort Independence, the McKay monument, plane spotters by the fence, Conley Terminal's cranes behind, the walkway round Pleasure Bay and the causeway to the Sugar Bowl | **The line:** whatever the time and the weather, the hot dog line is the same length. And the planes: one comes over every minute or so, low, and everyone on the island looks up | A goose; a relish packet; a plane spotter's logbook; a lost earbud |

Every apartment has a front stair hall (people on the clock climb it) and its porch on the front. The Grey One's porches are glass balconies.

## Cast
- **The Courier**, brown uniform, the parcel for "G. Goose, Third Floor": double-parked on Farragut Road, up every house's stairs to every third floor, sent away from each, at Castle Island for lunch, up the Green House's last flight at the end.
- **The landlady** (the Green House's first floor), who is the day. Fifty-two years, a clipboard, a ring of keys, a police scanner.
- **Inspector Pidge**, with the plane spotters at Castle Island, sure the next plane is the goose.
- **The truck's driver**, who's never driven a truck, and the queue behind her.
- **The couple from out of state** and their couch.
- **The curb collector** (Southie Christmas), in and out with free things all afternoon.
- **The movers in matching shirts** (the Grey One), and the three friends who said they'd help (everyone else).
- **The lawn chair audience** in Marine Park.
- **The regulars:** dog walkers and power walkers on the Sugar Bowl loop, the hot dog line, the spotters, a swimmer who swims every day of the year (the L Street Brownies are real; one of them has wandered down to Pleasure Bay).
- **Animals** (simple movers): the hamster, a French bulldog in a stroller, gulls, a cat on a porch, pigeons.

## Palette and plate
A wet, bright September street, printed in the siding colors of the triple-deckers against the grey of a rainy day. Draft inks for the art director to tune:

- Paper `#E6E2D6`: a pale, cool cream that follows the day (below)
- Siding `#9CB89A` (the Green House), with yellow `#EFD27A` and blue `#9DBBD4` for the rest of the row
- Condo `#5F666C`: the Grey One, and its black window frames
- Asphalt `#7F838C`: the road, the sidewalks a step lighter
- Park `#8DB86B`: Marine Park's lawns
- Harbor `#4F7F95`: Pleasure Bay and Dorchester Bay
- Truck `#E8793A`: the rental truck (a lookalike, orange and white), traffic cones, the "NO PARKING" signs' red

Line ink stays the game's navy (`#252D52`). The plate follows the day (`plate.at(t)`, as on the Block Party): cream at seven, grey while it rains (ten to three), clearing, pink behind Dorchester Heights at sunset, navy at night with every window on the row lit (the night printed, not dimmed, as on Plum Island). Brick `#B5654A` for the corner at East Broadway and the chimneys, shared with Newburyport.

## Alive
- **The move**, all day: boxes, lamps, mattresses and couches out of doors and down porches before noon, in and up after; movers on the clock walking the stair halls, so they vanish into a front door and turn up on their floor.
- **The truck**, stuck; the queue; the horns; the rescue at 3pm.
- **The rain**, ten to three: tarps over the curb pile, a mattress carried as an umbrella, the lawn chair audience under umbrellas, puddles on the road that stay till evening.
- **The planes**: arrivals for Logan's runway 4R come in low over Pleasure Bay about every minute, heading north-northeast; everyone on Castle Island looks up; the Roof Deck's glasses rattle.
- **The water**: Pleasure Bay calm, small waves on Dorchester Bay, a sailboat or two, a container ship's stack behind Castle Island.
- **The walkers** on the Sugar Bowl loop, the hot dog line, the dogs.
- **The evening**: the sun goes down behind Dorchester Heights at 7:20; every window on the row lights up, each on its first night (the landlady's TV, the nurse's dark window, the curb collector's shadeless lamp, the bike's screen).
- **Sound bed:** rain on awnings (while it rains), horns from the queue, a truck's reversing beep, gulls, the planes' rumble (the loudest cue, still under the honk), the hot dog stand's radio. Measured under the honk with `loudness()`.

## Mechanic
**Houses open like dollhouses** (new, decision 7). On the overview the houses are closed: fronts, porches, roofs, lit windows at night. Tap a floor of a house and its front fades away and the floors above it lift off, only on that house, so you're looking into that apartment. Step out and it closes again. It's what lets the level be a real street seen from outside and a set of rooms at once, and the same piece serves the Catminium, the cruise ship's hull, Departures' terminal and Newburyport.

**Out by noon, in after** (decision 8). Every apartment has a before and an after, on the day's clock: the old tenant's things are there in the morning and leave down the stairs, the new tenant's arrive after noon. Some finds belong to one side of noon, and the list says so ("before noon", "after noon"), reusing Plum Island's finds with a window (`when`, `note`). Each window is at least two minutes of every loop.

**The lease clock** (decision 9): the Plum Island dial, reused (`map.dial`). It says what's going on ("Moving out", "Noon: the keys", "Moving in", "First night") and a tap skips ahead: to noon, then to sunset, then to the next morning.

**The loop:** six minutes, dawn to dawn, uneven like Plum Island's, so both sides of noon get two full minutes:

| Loop time | Hours | What's on |
| --- | --- | --- |
| 0:00 to 0:15 | 5am to 7am | Dawn; the trucks arrive |
| 0:15 to 2:30 | 7am to noon | **Moving out** (rain from 10) |
| 2:30 to 2:45 | noon to 1pm | **The handover:** the inspection, the keys |
| 2:45 to 5:00 | 1pm to 9pm | **Moving in** (rain stops at 3; sunset 7:20) |
| 5:00 to 6:00 | 9pm to 5am | **The first night:** pizza on boxes, every window lit |

The "before noon" window is 7am to noon (2:15 of the loop); "after noon" is 1pm to 5am (3:15).

## Finds
Draft labels, one goose and three things per area (12 geese, 36 things). Final wording and spots at the greybox. Windowed finds are marked; the goose is never windowed.

| Area | Finds |
| --- | --- |
| The Landlady | The goose; the ring of spare keys; a coffee can of deposits; a police scanner |
| The Roommates | The goose; a ping-pong ball *(before noon)*; the hole behind the poster *(before noon)*; a sleep mask *(after noon)* |
| The Couch | The goose; a tape measure; the couch's missing leg; a floor plan on a napkin *(after noon)* |
| The Family | The goose; a runaway hamster *(before noon)*; a crayon drawing of the house; a pair of reading glasses *(after noon)* |
| The Overlap | The goose; a second toaster; a lease signed twice; the last box *(before noon)* |
| Southie Christmas | The goose; a lamp with no shade *(after noon)*; a free TV *(after noon)*; a "FREE" sign |
| The Open House | The goose; a plastic lemon; a realtor's name tag; a pair of shoe booties |
| The New Owners | The goose; a dog's rain boot; the bike's water bottle *(after noon)*; a smart speaker |
| The Roof Deck | The goose; a wine glass on the railing; a golf umbrella; a pair of binoculars |
| Farragut Road | The goose; a mattress tag; a snapped-off side mirror; a lawn chair saving a space |
| Marine Park | The goose; a kite in a tree; a lost flip-flop; a scorecard |
| Castle Island | The goose; a relish packet; a plane spotter's logbook; a lost earbud |

No brand names on finds or signs (decision 22): the exercise bike looks like the famous one, and is never called it.

## Shared universe
- **The goose** in every area, and on the Courier's parcel.
- **The Courier**, the story's thread; his parcel arrives right after it was needed, as on Plum Island.
- **Inspector Pidge** with the plane spotters at Castle Island.
- **Gander Cola**: a can on the landlady's windowsill and one on the lawn chair audience's cooler; at most one touch per area, never on a find.
- **A "Have you seen this goose?" poster** on a pole on Farragut Road, among the "NO PARKING" signs.
- **The next Boston places** on the skyline: the Seaport's towers (toward the Feast's Financial District), and a plane that's come from somewhere.

## Tone
Affectionate and local. The jokes are about the day (the truck, the couch, the keys, the curb, the rain, the line) and about the change everyone in Southie talks about (the grey gut-reno, the booties, the exercise bike), never about anyone losing a home or who can afford what. The old guard and the new people are both funny and both nice; the landlady is formidable, not mean. Left out on purpose: September 1, 2026 was also the state primary (politics dates a level and isn't the joke); the St. Patrick's parade and Evacuation Day belong to March; Storrow Drive isn't in Southie, so the only Storrowed truck is one that's limped over from there, roof peeled open.

## Real places, checked
Checked against OpenStreetMap (street bearings, building footprints and addresses), the National Park Service, the DCR, the city, the Cultural Landscape Foundation, and news to September 2026. Businesses are lookalikes with no names or logos; public places, streets and landmarks use their real names.

| Place | Where it really is | Still there? | How we show it |
| --- | --- | --- | --- |
| **Farragut Road** | Runs due north-south just east of P Street, about 530 m from East First Street to the shore road. West side: an unbroken row of houses (about East Second to East Sixth) facing east. East side: no houses, all Marine Park | Yes | By name. The row on the west, facing the camera across the road and the park (decision 3). Generic houses, no numbers: no one's home is identifiable |
| **The lettered streets** | G through P run true north-south (there's no J Street); A to F are a separate tilted grid by Broadway station and never reach City Point. P Street is the one just west of Farragut Road | Yes | A "P ST" sign on the corner at East Broadway; the rooftops behind the row |
| **East Broadway** | Runs east-west, between East Third and East Fourth, and ends at a small loop at Farragut Road, where Marine Park's circle and the Farragut statue are | Yes | The row's north end: the corner, the loop, the circle |
| **Marine Park** | 255 acres, split by Broadway. South of Broadway: the Marine Park bath house (by Pleasure Bay Beach), a playground, a picnic shelter, a lot. North of it: a rink with a pizza and burger stand facing Pleasure Bay, tennis courts, ball fields | Yes | By name. The south half is on the map; the rink and the stand are past the top edge |
| **The Farragut statue** | Admiral Farragut (1893) on the circle at East Broadway's end | Yes | On its pedestal, looking out to sea |
| **Day Boulevard** | Leaves the shore at the bottom of Farragut Road heading north-northeast through the park, past the circle, then due east along Pleasure Bay's north shore (a causeway with benches, Conley Terminal's fence on its north side) to the Castle Island lot | Yes | As it runs |
| **Pleasure Bay** | Closed off by a 1950s causeway to Castle Island and the Head Island causeway (1953) to the Sugar Bowl, a round spot with benches at its tip. Walkers call the whole loop "the Sugar Bowl" (about 1.8 miles) | Yes (the Head Island causeway was resurfaced in April 2026) | The lagoon, its walkway loop, the Sugar Bowl at the tip |
| **Castle Island** | Fort Independence (granite, five-sided), the McKay monument (a 52-foot granite obelisk, 1933) facing the shipping channel, the lot, the hot dog stand at 2080 Day Boulevard | Yes. The stand opened its 75th season on February 28, 2026 and closes in November, so it's open on September 1 | By name, the stand as a lookalike (decision 12). The fort's doors closed (weekend tours only) |
| **Logan's runway 4R** | Its centerline runs over Pleasure Bay, 200 to 300 m west of the hot dog stand, at about 020°. In northeast winds, arrivals come in low from the south-southwest; plane spotting at Castle Island is a thing | Yes | A plane over Pleasure Bay every minute or so, left to right, low (decision 13) |
| **Conley Terminal** | The container port north of Day Boulevard's causeway | Yes | Cranes and stacked containers behind Castle Island |
| **The Seaport** | Its towers 2 to 2.5 km north-northwest, past the Reserved Channel | Yes, and growing | Skyline at the back, a crane on it |
| **Dorchester Heights** | A white marble tower (1902) in Thomas Park, 2.5 km west. Restored (over $30M), the park reopened July 2025, rededicated March 17, 2026 | Yes | Skyline only, at the back left; the sun sets behind it (7:20pm, west-northwest, on September 1) |
| **The L Street Brownies** | The oldest polar bear club in the US; they swim all year | Yes | One of them, swimming in the rain in Pleasure Bay |
| **The L Street Bathhouse** | At the foot of L Street, 1.2 km west (renovated, reopened 2023) | Yes | Not drawn: the bath house on the map is Marine Park's own, which is really there |
| **A donut shop on the corner** | The nearest is on L Street, far to the west; there isn't one on Farragut Road | | Not drawn (decision 14). Its pink-and-orange iced coffee cups are everywhere instead, rain or not |
| **Moving Day** | About 79% of Boston's leases turn over on September 1 (one outlet's figure). 1,430 moving permits for September 1, 2026 alone; South Boston had 818 over the nine days around it, more than the next two neighborhoods together. Trucks need a street occupancy permit with posted "No Parking" signs | Every year | The signs, the truck, the curb |
| **Mattresses** | Banned from the trash in Massachusetts since November 2022; Boston wants a booked recycling pickup | Yes | The curb mattress in its plastic bag, with its tag |
| **"Storrowed"** | Trucks too tall for Storrow Drive's bridges, every September 1 (one on August 19, 2026). Not in Southie | Every year | One truck limped over from there, roof peeled (decision 15) |
| **"Southie Christmas"** | Curb furniture on Moving Day (the city-wide name is "Allston Christmas") | Every year | The curb pile and its collector |
| **September 1, 2026** | A Tuesday. Rain, heaviest mid-morning to mid-afternoon, 69°F. Also the state primary | | Rain ten to three (decision 10); the primary left out (Tone) |

**The sun on September 1:** up at 6:10am east-northeast over Castle Island (the right of our view), down at 7:20pm west-northwest behind the houses and Dorchester Heights (the back left).

## Engine and kit needs

**New: E11, buildings you step into.** Built first (PROCESS step 3), in its own commits, before the greybox. General, for any place with buildings seen from outside (the Catminium, the cruise ship's hull, Departures, Newburyport's houses):
1. **A zone's outside** (`R.shell(draw)`): the fronts, porch rails, roof and lit windows facing the camera. Drawn over the zone on the overview; it fades out when you step into that zone, and back when you leave. Cached like any still layer, so a closed house costs a stamp.
2. **Floors lift only in their own building** (`cutaway.above: 'column'`): stepping into a second floor lifts the third floor of that house, not every third floor on the street. In that mode the front cutaway cuts everything in front of the room, at every height (the house next door's upper floors would otherwise stand over it).
3. **Taps on a closed building** land on the floor whose front you tapped: a zone with an outside counts its whole box (floor to ceiling), and the nearest box along the line of sight wins.
4. **Finds inside** can't be tapped from outside: a find in a zone with an outside only counts when you're in that zone, unless it says it's outdoors (`out: true`, a porch or a window box).
5. **Buildings on a land** (`land: false` on a zone's place): a zone that stands on the map's ground without printing it or being shaped by it (a house on a map with water).
6. **Checks:** the smoke test opens a house (the front fades, the floor above lifts, the next house doesn't), taps a closed house's second-floor front and lands on the second floor, and can't tap an inside find from the overview; QA frames every apartment open; the playtest tool shoots them open.

**Reused, already built:** ground and water (E4) with a steady level and small waves, no tide; areas of any shape (E5) for the road, the park and the island; a day's paper (`plate.at(t)`, the Block Party); lights and night printing; rain (E1, `weather.js`) on a day map; finds with a window and the dial (Plum Island); walkers on one clock through doors and up stairs (E2); the finale (the Block Party, Plum Island).

**The level's own kit** (`src/maps/southie/kit.js`, promoted if others want it): a triple-decker (clapboard siding, a bay stack, porches three high with columns, a flat roof with a cornice, windows lit at night), a rental truck, parked cars, the curb pile, a lawn chair, a jet with its shadow, the iced coffee cup.

**Performance:** nine stacked apartments, a long road and a big park. The bar, on the owner's 2017 laptop: no view slower than the Block Party's (its streets 18 to 21 frames a second, rooms 21 to 33). A closed house is one cached picture; the rain is the new cost, measured in the greybox.

## E11 as built (session 6)
Built in the engine before the greybox, in its own commit, and checked by the smoke test on this level:

- **A zone's outside** is a layer (`R.shell(draw, o)`), drawn after everything in the zone and before the air. It shows while you're anywhere but in that zone, and fades out (and back) as you step in and out (`zone.shellK`, animated by the renderer like walls going up and down). On the overview a closed house is a still picture like any other zone's.
- **`cutaway.above: 'column'`** lifts only the zones above the one you're in whose footprint overlaps it (that house's upper floors), dims nothing, and cuts everything in front of the room at every height, not just its own floor.
- **Taps:** a closed building counts its whole box, floor to ceiling. On a map with any, where a tap's line of sight meets several things (a house's second floor, its third floor above and behind, the street), the nearest wins: the highest point it meets. Other maps keep the old rule.
- **Finds inside** a closed building can't be tapped (`out: true` for one on a porch or a window box, which can).
- **Buildings on a land:** `land: false` on a zone's place, so it stands on the ground without printing it; `span` set to the floor height, so each point is in one floor.
- **Porches:** a building's outside can say what floor it encloses (`box`); standing things outside that (its porch, whoever's out on it, the couch at the end) are drawn after the outside, since they stand in front of it. Without it the front painted over its own porches.
- **Taps in a room:** in the room you're in, a tap inside its own outline is the room's, since whatever's in front of it is cut away there (the house in front's upper floors); and on a map with buildings the walls are tested finer (a shallow apartment's framing is centered up on its back wall, which the old 2-unit steps jumped over, so a tap there fell through to the street behind).
- **Found on the way:** stacked floors could be drawn out of order (a ground floor waiting on a strip of yard behind it, drawn after the floors above it). A floor is now always drawn after the one it stands on. The shipped places' draw order is unchanged, checked map by map.

## The greybox (session 6, gate 2)
At `#/southie` (hidden from the picker until it ships). Everything below is plain blocks, labels and numbered pins; the art replaces it and keeps the layout, the walks and the finds.

- **The layout** as the table under Shape has it, tightened: 96 x 68. The row on Farragut Road at the left (x 0.5 to 15.5, inside one of the road's 16-unit chunks so its houses never straddle a seam), the road (sidewalks, parking both sides, two lanes), Marine Park from x 28.5 to the beach at 42.5, Pleasure Bay from 50 to 74, Castle Island's mound at the right with the fort on it, the harbor across the front. Day Boulevard runs along the shore, up through the park past the Farragut circle, and out along the bay's causeway to the Castle Island lot.
- **The houses:** the Green House, the Yellow House and the Grey One, north to south, a zone per floor (4.4 units floor to floor), each with its floor, two back walls, a stair hall along the north side (the back wall, so nothing in it stands between you and the rooms), porches three high on the north half of the front and a bay stack on the south half, and its outside: the front, the south side, the bay, the roof, windows lit at night. The front door is under the porches. The rest of the row stands north of East Broadway and south of the Grey One (not enterable, drawn by Farragut Road).
- **The clock** as the Mechanic table has it (`clock.js`): before noon 7am to noon, the handover noon to 1pm, after noon 1pm to 5am, rain 10am to 3pm, sunset 7:20pm. The lease clock on screen skips to noon, sunset and the next morning. The paper goes grey with the rain, pink at sunset, navy at night.
- **Farragut Road:** parked cars both sides, the truck in at 7, stuck by 9 between a parked car and a double-parked pickup, the queue behind it, the car bounced aside at 3pm, the truck out; the Storrowed truck; the curb pile in front of the Yellow House, leaving one piece at a time as the collector carries it up; NO PARKING signs; the goose poster; the couch on its rope in front of the Green House from 9am.
- **Marine Park:** the Farragut statue on its circle, the bath house, the playground, the shelter, trees, the lawn chair audience facing the row, walkers along the beach.
- **Castle Island:** the fort on its mound, the McKay monument, the hot dog stand and its line, the lot, containers along the port fence, plane spotters and Inspector Pidge, walkers on the east walkway and the Sugar Bowl.
- **Around it** (`ambient.js`): City Point's rooftops behind the row, Dorchester Heights far off at the back left, the Seaport's towers behind, the port's cranes; the rain; a plane on runway 4R's line over Pleasure Bay about once a minute.
- **The people on the clock** (`day.js`): the Courier (every house's third floor from 7:30, a hot dog at Castle Island after noon, the Green House's third floor at 9:30pm); the landlady (the inspection from 11am, keys on the porch at noon); a mover in each house, out before noon and in after; the curb collector, four trips up the Yellow House.
- **Framing:** on a phone held upright the overview frames the row and the road at full height; the park and the island are a swipe to the right.

## The art (session 6)
The lead drew the shared kit first (`kit.js`: the finished triple-decker with its clapboards, corner boards, trimmed windows, bay, porches with balusters and the cornice with dentils, and the Grey One's modern variant with glass balconies; each printed again in dusk inks at night with its windows lit; cars, the HEAVE-HO rental truck, cartons, iced coffee cups, lawn chairs, a bagged mattress), each apartment's colors (`ROOM` in the style sheet), the sound and what's around the map. Then eight artists in their own worktrees (a house each, the road, the park, the island, the cast on the clock), then one art director over the whole level.

**What's there now:**
- **The Green House:** the landlady's front room (rosebud wallpaper, the plastic-covered couch, a hall of fifty-two years of tenants, the scanner narrating the street, her friend Dot at the kitchen table with scratch tickets, the nephew under the sink); the roommates' last morning (THE DEPOSITS reunion tour poster sliding down at 11:37 to show the hole, beer pong against himself, a chore chart that says "nobody"), then the night-shift nurse asleep in a mask with printed eyes, the one dark window on the row at night; the last tenant's hammock-and-lava-lamp flat ("It's all yours!"), then the couple measuring the stairwell ("Seventy-one inches." "It's seventy-two.") and rigging the pulley on their porch.
- **The Yellow House:** the family's boxes with the hamster popping out of a different one every twenty seconds, a beagle always at the right box, a height chart that gains PEANUT at the bottom; the Overlap's two of everything, the stopped clock at 11:58 and the last box that keeps getting one more thing; Southie Christmas, empty on purpose (a calendar left on AUGUST) until the curb comes up one piece at a time, and Christmas lights on the first night ("It's September.").
- **The Grey One:** the open house (lemons with "DO NOT EAT", booties, eighteen visitors at 1pm, "Is the island load-bearing?", nineteen offers by evening), and the landlady herself walking through in her shoes at 1:45, leaving prints the realtor mops at 3:30; the new owners, their dog in a raincoat and a stroller, a smart speaker that answers wrongly, and the exercise bike's trip up to the wrong floor, down through the showing ("The bike is not included.") and back; the penthouse's hot tub on the balcony, and every conversation stopping mid-word when a plane comes over.
- **Farragut Road:** the truck (in at 7, stuck by 9, "IS THIS A STREET?"), the car in its own NO PARKING zone ticketed at 8:05, the pickup's owner in a recliner in its bed ("Take your time."), the queue honking, the car's owner at noon ("Huh." "Nope."), six neighbors bouncing the car aside at 3 ("HEAVE!" "HO!") and applause; the couch on its sling with a hard hat below on the guide rope; the curb pile under a tarp in the rain; the Storrowed truck and its driver in a foil blanket ("Nobody mentioned bridges."); the Courier's van ("PARCELS (EVENTUALLY)"); the goose poster; streetlights and a pizza car at night.
- **Marine Park:** nine neighbors arriving with lawn chairs to score the moves (the truck gets a two, then ten at 3pm), a plaid free couch carried onto the lawn at 1:10 and sat on till the small hours; Farragut on his pedestal with pigeons on his cap; the kite in the tree and the frisbee that joins it; the playground empty in the rain and the kid who jumps the first puddle; boxes stacked under the shelter out of the rain; the bath house ("NO LIFEGUARD / SEE YOU IN JUNE"); a Brownie swimming through the rain ("Sixty-one degrees!"); power walkers in ponchos on the Sugar Bowl loop.
- **Castle Island:** the hot dog line, the same length at every hour (thirty customers a day, and at night in lawn chairs: "They open at eleven."), the goose in it forever; the spotters and the radio ("...four right, cleared to land..."), Inspector Pidge sure every plane is the goose; Fort Independence closed on a Tuesday and a tourist knocking; the McKay monument; the Sugar Bowl and a footbridge; a container ship up the channel.
- **The cast on the clock:** the Courier (a parcel for G. GOOSE, 3RD FLOOR, winded on every staircase, a hot dog at lunch, "Worth it."), the landlady (housecoat, curlers under a rain bonnet, a ring of keys that jingles), three movers each carrying something different on every trip, the curb collector in a garbage-bag poncho dragging the soaked couch.
- **Around the map:** the backs of P Street's triple-deckers facing the row across the yards, rooftops fading behind, Dorchester Heights' tower far off, the Seaport, the port's cranes on their quay, jets coming in low with their shadows on the water, clouds, stars.
- **The ending:** the couch hands over from the road to the Green House's top porch at the first frame of the ending; eight geese haul, it wobbles over the rail and pivots, four sit on it, the couple in the porch door ("Close enough." "It's seventy-two.").

**Engine, on the way:** a map can pick the moment its picker card shows (`plate.thumbAt`); an ending's area is drawn live every frame for its first minute (it was a picture refreshed when there was time, so the pivot stalled; the Block Party's and Plum Island's endings get it too); a long area honks from over its goose; the harbor's water takes the night.

## QA, speed and the playtest (session 6)
- **QA** (`npm run qa -- southie`, on the owner's 2017 laptop): 15 passed, 0 warnings, 0 failed. Slowest view on the slowed-down phone check: Farragut Road, under the 60 ms budget. The smoke test passes, with checks for houses you open.
- **Real frames a second** on the 2017 laptop (`node tools/fps.mjs southie`), 1440 x 800 window: at 2x the whole map 40, the apartments 13 to 18, Farragut Road and Marine Park 11, Castle Island 14; as a player gets them, with sharpness stepping down to 1.5x (`--auto`), the apartments about 25, the road and the park 17. A little under Plum Island's areas (12 to 21 at 2x). The drawing code takes 2 to 13 ms a frame, and switching off the cutaway, the skyline or the sky changed little: it's the graphics chip putting the picture on screen, as on the Block Party and Plum Island.
- **Blind playtest, round 1:** 39 of 48 on the first pass. Four misses were finds that weren't drawn at all (painted over by the counter, table or sofa they stood on: each now sorts after its furniture); the rest were decoys (a lemon painting, a red can by the scanner, white cylinders by the binoculars, a white lens by the logbook), a tag too small, and tap areas too tight (now 0.85 to 1). - **Blind playtest, round 2** (a new tester, fresh shots): 46 of 48. Both misses were the right objects just outside their tap areas (the name tag by 3px, the lemon's area sat on the bowl beside it): both moved onto their art. Also from its notes: the rain boot redrawn as a boot, the bike's water bottle drawn half again as big, and "A second toaster" relabeled "A toaster on a milk crate" (there are two). Hardest left: the rain boot and the water bottle (4 of 5 before the fix), none never found.
- The first tester also asked for the time on the dial ("11:40am · moving out") and for room names that fit the bar: both done.

## For the owner at gate 3
Each with a recommendation; every earlier call is in Decisions, and any can be overturned.
1. **Play it on your phone** at `#/southie` (hidden from the picker until you approve): tap a house's floor and it opens, the floor above lifts; step out onto the road and the houses close. *Recommend:* approve the houses you open (E11) as the level's mechanic.
2. **Farragut Road, not a lettered street** (decision 3). *Recommend:* keep; it's the only real street where you can see the row from the air.
3. **Speed on the 2017 laptop:** about 25 frames a second in the apartments and 17 on the road and in the park, as a player gets them. *Recommend:* ship as is, and take the next step on older laptops (the open roadmap item) for every place at once, rather than for this level.
4. **Rain from ten till three** (decision 10) greys the whole map for a third of the loop. *Recommend:* keep; it's what happened on the day and the funniest part of it (the mattress umbrella, the ponchos, the Brownie).
5. **It ships to the picker** after Plum Island, as "Moving Day" with "South Boston" under it. *Recommend:* yes.

## Open questions
None: the lead took its own recommendations (decisions below), and the owner can overturn any of them at the preview.

## Decisions

The lead's calls at the brief (gate 1), session 6 (Sept 2026), each with its reason:

1. **Moving Day goes first** of the three Boston places (the owner's instruction for this session): it reuses the most (streets, water, the day) and adds one engine piece (E11) the backlog needs anyway.
2. **The id is `southie`; the picker says "Moving Day" with "South Boston" under it** (Plum Island's name-and-subtitle card, the other way round: the event is the name people remember).
3. **Farragut Road, not a lettered street.** A street with houses on both sides can't be seen into from the south; Farragut Road has its row on one side and Marine Park on the other, so the row faces the camera across open ground, and Castle Island, Pleasure Bay, the statue and the planes are all really there. The lettered streets are right behind (P Street). This corrects the sketch, which had houses on both sides of a street running the wrong way.
4. **Looking northwest from over the harbor** (x east, y south): the shore runs across the bottom, Castle Island at the right, the sunset at the back left, the planes crossing left to right as 4R's arrivals do.
5. **Three enterable houses, nine apartments, plus three outdoor areas** (twelve geese). The row runs on past them at both ends as scenery, so it reads as a street, not three houses on a lawn.
6. **One of the three is a gut-renovated triple-decker** (the Grey One: grey paint, black windows, glass balconies, "LUXURY RESIDENCES"), rather than the sketch's glass condo tower: no big new building stands on that stretch, and the grey gut-reno is the change everyone in Southie actually talks about.
7. **Houses open like dollhouses** (E11): closed on the overview, opened by the floor you tap, only that house.
8. **Out by noon, in after:** finds with a window on each side of noon, reusing Plum Island's; each window at least two minutes of the loop.
9. **The lease clock** is Plum Island's dial, reused, skipping to noon, sunset and morning.
10. **It rains from ten till three**, because it did (September 1, 2026), and moving in the rain is funnier: tarps, a mattress as an umbrella, the audience under umbrellas, puddles till evening.
11. **A six-minute loop, dawn to dawn, uneven:** the Mechanic table.
12. **The hot dog stand is a lookalike,** no name, as the rules say; its line is the same length all day.
13. **Planes over Pleasure Bay** every minute or so, low, left to right: 4R's arrivals in a northeast wind, which is a rainy day's wind.
14. **No donut shop:** there isn't one on Farragut Road, and locals would know. Its cups are everywhere instead.
15. **One Storrowed truck,** roof peeled, parked on Farragut Road, its driver still in shock: the famous September 1 joke, without moving Storrow Drive.
16. **The finale is the couch:** the geese haul it in at 9:30pm; the Courier's parcel is packing tape ("Could've used that this morning.").
17. **The landlady is the day's clock:** she inspects at 11:30, hands out keys at noon, narrates at night. Formidable, not mean.
18. **The old and the new are both nice** (Tone): the gut-reno people get the booties and the exercise bike, the old guard gets the scanner and the plastic on the couch; nobody is the villain.
19. **Dorchester Heights is skyline only,** 2.5 km west; the sun sets behind it.
20. **Marine Park's own bath house** stands in for the L Street Bathhouse, which is 1.2 km west, off the map.
21. **The night is printed, not dimmed,** as on Plum Island: every window on the row lit on its first night.
22. **Brand names on finds:** none. the exercise bike looks like the famous one and is never called it; the rental truck and the hot dog stand are lookalikes too.
23. **The paper follows the day and the weather** (grey while it rains), and the page and the browser's bars follow it, as on the Block Party.
24. **Engine work is this level's this round** (the owner: Moving Day owns engine changes while the cruise ship is built in parallel; it merges first). E11 is written general, so the cruise ship's hull can use it once it's merged.

The lead's calls at the greybox (gate 2), session 6, from its contact sheet (QA: 14 passed, 9 warnings, 0 failed):

25. **The greybox is approved; the layout is fixed.** The row reads as a row of triple-deckers from the whole map, every apartment frames well on a phone and a laptop, and the day reads at every moment (the rain's grey, the pink sunset, the navy first night).
26. **The map is 96 x 68,** tightened from the brief's 110 x 72 so the row is the hero: the park and Pleasure Bay were squeezed, the harbor band in front kept.
27. **The stair hall runs along each house's north side** (its back wall, as the camera sees it), with the porches on the north half of the front and the bay stack on the south half: a hall along the south side stood between the camera and the rooms.
28. **The ending happens on the Green House's top porch**, where the street can see it: the couch comes over the rail, gets pivoted, and the geese sit on it out there ("close enough"). Inside, it would be hidden by the house's closed front.
29. **Outdoor finds get bigger in the art** (tap radius about 0.9 and objects near a unit): QA warns the greybox's are about 10px across on a phone.
30. **No walls-down cutaway:** houses are closed on the overview instead, and the road, park and island have no walls to drop.
31. **The cranes, the skyline and the rooftops behind the row are placeholders** that the art makes smaller and fainter: in the greybox they compete with the row.

The lead's calls in the art (session 6), on the art director's findings:

32. **The couch changes hands at the first frame of the ending:** the road stops drawing it and the Green House draws it from then on, hanging, hauled and pivoted, so it's never in two places.
33. **The landlady herself walks through the Open House** at 1:45pm (the Grey One draws her with the cast's look, and the cast hides her at home meanwhile), not a lookalike.
34. **Three couches, three jokes:** the hero on the rope, the curb's purple one that goes to Southie Christmas, the audience's plaid one on the lawn. One stray cat on the street; rail pigeons only on the Green House's top porch and Southie Christmas; "Step 1 of 94" belongs to the Overlap.
35. **The shared street pieces live in the kit** (umbrella, streetlight, bench, pigeon, cat, the held iced coffee), promoted from the areas' copies.
36. **Dorchester Heights is faint and low, at the far top left,** off a laptop's overview and seen zoomed out or on a wide screen: in this view west is up and to the left, where the title is.

The lead's calls after the playtests (session 6):

37. **"A second toaster" is "A toaster on a milk crate"** (there are two toasters; the label has to pick one). Its id is unchanged, so nothing about saves changes.
38. **Every find's tap area is 0.85 to 1 unit**, centered on its art, and a find standing on a big single-piece counter or table sorts after it (four were painted over before).

