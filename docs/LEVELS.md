# Level backlog

Pitches for future places. The owner adds ideas; each gets a spin that makes it ours, a story to investigate, a shape, and what makes it feel alive. Tone: adult humor and darkness are welcome (think dark comedy, not gore for its own sake).

When a level is picked, it gets a full brief (see ROADMAP.md, "How a new place gets made").

Rough isometric sketches of the Sept 2026 picks (outline, hero, connections, numbered jokes) are in [sketchbook.html](sketchbook.html): open it in a browser (the owner's published copy: https://claude.ai/artifact/CihrNwU7bQcTQojt1pyArf, private). Each place's **Layout (sketch)** line below says where things sit in it. They were drawn from memory: check every real landmark against a real map before a brief.

## Real places
The owner's direction: many places should be real, recognizable places, because people light up at seeing somewhere they know. The rules for them:
- **Lookalikes, never names or logos,** for real businesses (the donut chain, the bar everyone photographs, the pastry shops, the neon sign over Kenmore). Landmarks, streets and public places can be named.
- **Public places only.** No private homes anyone could identify. Check a landmark still stands: the Pink House was demolished in 2025 (it has a memorial sign now).
- **Get the geography right.** Locals will check. Every brief starts from a real map; compress distances, never move things to the wrong side of the street.
- **A later feature: asking for a place.** Not made on demand (every level is hand-built), but a vote: people suggest places, the most-asked get built, and whoever asked is credited on the map.

**What it needs** says which engine pieces must exist first:
- *Today*: works with the current engine (rooms and interiors).
- *Terrain*: needs ground with height, water and coastlines (ROADMAP E4, E5).
- *Animals*: needs a non-human cast (ROADMAP E6).
- *Night*: needs lighting (windows and lamps that glow, a dark palette) (ROADMAP E1, built in session 2).

## From the owner's list

### Death at Gooseworth Manor (murder mystery)
**Status: shipped (PR #9). Full brief in [levels/manor.md](levels/manor.md).**
- **Spin:** a dinner party in a cutaway country house on a stormy night. The host is dead in the library, every guest has a motive, and the finds are **evidence** (the poison bottle, the torn will, the muddy boots). Find it all and the game names the killer.
- **Alive:** guests drift from room to room on a loop, candles gutter, lightning flashes light up rooms for a second (and shows who was where), secret passages behind the bookcases.
- **Dark humor:** the body keeps getting moved by guests who each think they did it. The butler is already packing.
- **Shape:** a sprawling house cut open along a curved line, grounds and a hedge maze outside.
- **Needs:** Today + Night. A "whodunit" ending (evidence leads to an accusation) is a new game format worth building once and reusing.
- **Status:** shipped (session 3; brief in [levels/manor.md](levels/manor.md)).

### The Block Party (the Block, connected: a city block)
**Status: built, at gate 3 (the preview), `#/blockparty`. Full brief in [levels/block.md](levels/block.md).**
- **Spin:** the Block's sixteen rooms, opened onto real streets, on the day of the Block Party. The Courier goes door to door all day with a parcel for "G. Goose, The Block", and every door has a goose behind it.
- **Alive:** the neighbors carry the party into the street (the cake, the banner, the amps), the octopus escapes down the alley, a queue forms that nobody can explain; a whole day on a loop, each room busiest at its hour.
- **Shape:** the Block's square, with Main Street crossing the middle and alleys between the rest.
- **Needs:** Today, plus areas of any shape (E5, built in session 4). Replaces today's Block.
- **Status:** shipped (session 4e). It took over The Block's id, `block`, so saves carried over; brief in [levels/block.md](levels/block.md).

### Plum Island (Newbury, Massachusetts)
**At gate 3: brief (gate 1) and greybox (gate 2) approved, drawn and playtested in session 5c (hidden, `#/plum`). Replaces Low Tide (Cape Cod):** same beach and tide, moved to a real place. **Brief: [levels/plum.md](levels/plum.md).** The brief corrects this sketch's geography (the lifeguards, the erosion, the refuge gate, the lighthouse's side of the point); where they differ, the brief wins.
- **Spin:** a barrier island through a summer day on a loop, the Great Marsh behind it and the Atlantic in front, joined to the mainland by one low road. The tide runs on the day's clock: going out, it drains the marsh creeks and the flats and uncovers finds you can only reach at low water; coming back, it floods them again. At a king tide it takes the road too (it really does).
- **Heroes and jokes:** the Pink House's memorial sign in the marsh (the house was demolished in 2025; see the brief); the turnpike flooding while someone tries it anyway; beach houses that met the ocean; the plover closure (miles of beach for six birds); greenhead fly traps (the flies are winning); the lighthouse at the north end, seals on the jetty; the refuge boardwalk and its observation tower full of birders; the little airfield on the marsh.
- **Alive:** the tide itself, all day; the beach filling by noon and emptying at sunset; boats in the river mouth, kayaks on the Sound.
- **Shape:** wide. The island runs left to right, marsh at the back, ocean in front, the river mouth at the north end.
- **Layout (sketch):** the island left to right, the refuge's dunes and closed plover beach at the south (left) end, the town at the north (right) end where the turnpike lands: houses in rows, the beachfront ones on stilts, the lighthouse and playground at the point, the jetty running out from it. Behind: the Great Marsh with its creeks, the greenhead traps, the turnpike crossing it, the airfield beside the road, the clam shack, Plum Island Sound (back left) and the river (back right). In front: the ocean beach, busiest by the town.
- **Needs:** Terrain and water (E4), built and proven on this level: ground with height, water with a shoreline that moves, a tide on the clock. The day's loop from the Block Party.
- **Pairs with:** Downtown Newburyport, across the river. They could share one plate, or be one connected map (owner to decide).

### Downtown Newburyport (Massachusetts)
- **Spin:** Yankee Homecoming weekend. Brick downtown around Market Square (rebuilt in brick after the fire of 1811), captains' houses up High Street, and the waterfront on the Merrimack with booths, boats and a fireworks barge.
- **Heroes and jokes:** High Street's widow's walks, one lookout a goose; the fireworks barge with one fuse lit too early; the old firehouse on the square, now an arts center; the granite Custom House; the Inn Street fountain full of kids; the Route 1 bridge to Salisbury.
- **Alive:** the river parade of boats, crowds along the boardwalk, the whale watch boat coming and going.
- **Shape:** wide: High Street on the hill at the back, downtown in the middle, the river in front.
- **Layout (sketch):** High Street along the back on the hill, captains' houses both sides with widow's walks; State Street running down from it to Market Square, with Pleasant Street beside it and Inn Street's pedestrian walk (the fountain) off the square; the old firehouse on the square's river side; the Custom House to the east near the water; the waterfront park and boardwalk along the front, piers into the Merrimack, the fireworks barge and the whale watch boat in the river; the Route 1 bridge to Salisbury at the west edge.
- **Needs:** Today, plus a light river (E4). After Plum Island (it reuses the water).

### The Emperor's Basement (Split, Croatia)
- **Spin:** Split's old town really is built inside a Roman emperor's palace. Show both at once: modern life on top (cafés, laundry strung between 1,700-year-old walls, cruise crowds following tour paddles) and the Roman cellars cut open below, where Emperor Diocletian's ghost is still furious about the tourists.
- **Heroes and jokes:** the cathedral bell tower (the hero); the Peristyle, where "Diocletian" and his soldiers pose for photos at noon; the cellars with souvenir stalls, a film crew and the ghost; the giant bronze bishop outside the Golden Gate, his toe rubbed gold for luck; the Vestibule, open to the sky, with singers inside; the green market outside the Silver Gate; the Riva's palms and cafés; a cruise ship nearly as long as the palace.
- **Alive:** tour groups snake through in lines, laundry flaps, cats everywhere, ferries along the harbor.
- **Shape:** the walled rectangle of the palace (a square, for Squares), the Riva and harbor in front, Marjan hill to the west.
- **Layout (sketch):** the palace's walls with a tower at each corner and a gate in each side (Golden to the north, Silver east, Iron west, Brass south to the sea); the Peristyle in the middle with its colonnades, the cathedral just east of it with the bell tower at its side, the Vestibule to the south; the cellars under the palace's south half, cut open along the south wall; houses packed into everything else, laundry across the lanes; the square outside the Iron Gate (cafés), the green market outside the Silver Gate, the giant bishop outside the Golden Gate; the Riva's palms and cafés along the front, the harbor with ferries and the cruise ship; Marjan hill and its pines at the west edge.
- **Needs:** Terrain and water (E4) for the harbor and the hill; the palace and the cellars (a cut below ground) work today.

### La Dolce Riviera (Italian coast)
- **Spin:** a pastel cliff village tumbling down to a tiny harbor and a beach of striped umbrellas in perfect rows. A wedding on the clifftop, and the ring has just gone over the edge. Follow it down: off a roof, through a balcony, into a fishing net, onto the beach.
- **Alive:** waves, Vespas zigzagging up the hairpin road, a ferry dumping tourists every minute, laundry, a nonna shouting from every window.
- **Adult humor:** a very tanned man in a very small swimsuit, a yacht with two affairs on it at once.
- **Shape:** tall cliff meets wide beach.
- **Needs:** Terrain.

### All You Can Eat (cruise ship)
**At gate 3 (the preview), hidden at `#/cruise`. Brief: [levels/cruise.md](levels/cruise.md) (session 7, built alongside Boston).** The brief settles the story (patient zero is a stowaway iguana), the four decks and the port; where it differs from this sketch, the brief wins.
- **Spin:** a cruise ship cut open from bow to stern on day four. Something at the buffet has started spreading deck to deck. Find patient zero (the green one) before the ship docks at a port nobody gets off at.
- **Alive:** waterslide, pool, a lifeboat drill nobody is listening to, a limbo contest, a man being carried back to his cabin at 11 a.m.
- **Adult humor:** the adults-only deck, a divorce playing out in cabin 7, the casino open at 9 a.m., and below the waterline, the crew having a better party.
- **Shape:** very wide: the hull and three decks cut open, the top deck on the roof, a small island port in the corner.
- **Layout (sketch):** the hull below the waterline in two cut-open floors (engine room, crew party, laundry, galley, cargo, the brig), a pointed bow; three passenger decks above (theater, the buffet, the casino, shops, spa, kids' club; then cabins, cabin 7 among them; then more cabins and the adults-only lounge); the top deck on the roof: pool, waterslide tower, funnel, bridge, deck chairs, the limbo contest, the lifeboat drill along the rail; lifeboats hanging on the side; a small palm island port in the corner with a tender boat going nowhere.
- **Needs:** Today (it's stacked interiors, sideways).

### Moving Day (South Boston)
**Boston is three places now,** each one real neighborhood with one event, instead of a panorama of landmarks (which reads as a postcard, with nothing to explore). Replaces Wicked Pissah.
- **Spin:** September 1st, when most leases in the city turn over at once. A lettered street of cut-open triple-deckers where everyone moves on the same day: the old neighbors out, the new condo people in, and everyone's stuff in the wrong apartment.
- **Heroes and jokes:** a moving truck on a street built for horses, cars parked on both sides (Storrow Drive isn't in Southie, so the famous stuck truck can't be the hero); a couch going up to the third floor on one rope (pivot); the new glass condo moving in a Peloton and a dog stroller; curb furniture, help yourself; Dorchester Heights watching over it; Castle Island and the hot dog line at the end of the causeway; the Seaport's towers a little closer every year; a plane landing at Logan, rattling every window.
- **Shape:** wide: the street between two rows of triple-deckers, the beach and Day Boulevard in front, the Seaport behind.
- **Layout (sketch):** Dorchester Heights and its monument on a hill at the back left; the Seaport's glass towers at the back right; a row of cut-open triple-deckers, the narrow lettered street (cars parked both sides, the truck stuck between them, a honking queue behind), a second row with the glass condo and the donut shop on the corner; then Day Boulevard, the L Street Bathhouse on the beach, the harbor; Castle Island (the fort, the flag) at the front right, reached by the causeway from the hot dog stand. A plane crosses overhead.
- **Needs:** Today (streets and cutaway houses), plus a light harbor (E4).

### Beacon and Arlington (Back Bay, Boston)
- **Spin:** one corner the morning after a blizzard. The Public Garden on one side, Beacon Street brownstones on the other, the footbridge over Storrow to the frozen Charles. A close crop with bigger people and fewer, funnier finds (the park-corner reference, ref 2).
- **Heroes and jokes:** a space saver feud on Beacon Street; Washington on his horse with a foot of snow on his hat; the lagoon frozen, no skating allowed, everyone skating; the ducklings in knitted hats (as always), one of them a goose; the bar everyone photographs and the line photographing it; a runner on the Esplanade in shorts; a snowman contest on the Comm Ave mall; the plow reburying what people dug out.
- **Shape:** a square snapshot.
- **Layout (sketch):** the Charles (frozen) along the back, the Esplanade, then Storrow Drive; the brownstones on the north side of Beacon facing the garden (the bar with the green awning among them); Arlington Street down the left, with the footbridge climbing from the corner over Storrow to the river; the Back Bay west of Arlington, with the Comm Ave mall and its snowmen; the Public Garden filling the front right: Washington on his horse at the Arlington gate on the Comm Ave line, the path east over the lagoon's bridge, the ducklings along the Beacon side at the far (east) end, bare trees and snowball fights.
- **Needs:** Today and a winter plate. Character scale per place (E6) for the bigger people.

### The Feast (North End and Financial District, Boston)
- **Spin:** the North End and the Financial District facing each other across the Greenway: 1700s lanes on one side, glass towers on the other, and under the park, the highway that used to split them. It's feast weekend: a saint covered in dollar bills parades up Hanover Street while the suits try to eat lunch.
- **Mechanic:** the Greenway cut open to show the highway tunnel still running underneath (the same below-ground cut as Split's cellars).
- **Heroes and jokes:** two pastry shops, two lines, one feud; Old North Church with two lanterns in the steeple; Paul Revere's house, dwarfed; Faneuil Hall's golden grasshopper; the Custom House clock tower; suits eating lunch in Post Office Square, pretending not to hear the band; harbor seals outside the aquarium; City Hall (people have opinions); the Zakim in the corner.
- **Shape:** a square: the Greenway down the middle, the harbor on the right.
- **Layout (sketch):** the Charles and the Zakim at the back left, City Hall below them, Faneuil Hall and Quincy Market (the plaza, street performers) west of the Greenway; the Financial District's towers at the front left, with Post Office Square's park and the Custom House tower beside the Greenway; the Greenway down the middle (food trucks, the carousel, the ring fountain), cut open at the front to show the tunnel and its traffic; the North End at the back right, Hanover Street running diagonally through it with the parade and the flags, the pastry shops facing each other, Old North Church, Paul Revere's house in North Square, the burying ground at the north edge; the waterfront at the front right: Long Wharf, the aquarium and its seals, Rowes Wharf, the harbor.
- **Needs:** Today, a light harbor (E4), and a cut below ground.

### The Siege of Mudbury (medieval battle)
- **Spin:** a siege that's a farce. Catapults launching cows, a knight stuck upside down in his armor, the castle's toilet chute emptying onto the attackers, a peasant selling snacks to both armies. Nobody remembers why they're fighting. Find the letter that started it.
- **Alive:** trebuchet loops, arrows, a battering ram that keeps missing the gate, a plague cart doing the rounds ("bring out your dead").
- **Shape:** one big map, castle and battlefield.
- **Needs:** Terrain.

### The Block, But Wrong (alternate universe)
- **Spin:** the Block's 16 rooms in a parallel universe. Same layout, everything inverted: the laundromat washes people, the aquarium's fish watch humans in tanks, the library shushes you, the pool is full of jelly. Tap a button to flip between the two Blocks and spot what changed.
- **Alive:** everything the Block has, wrong.
- **Shape:** the Block's plate, reused.
- **Needs:** Today. A flip mechanic. The cheapest level on the list, and a big shared-universe payoff. Now builds on the Block Party (the connected Block) rather than the flat plate; after Plum Island and Boston.

### The Great Escape (the zoo)
- **Spin:** someone left every gate open. The animals are loose and hiding all over a zoo terraced up a hill (the lion in the ice cream van, the flamingos in the gift shop, the penguins riding the train, the panda on the cable car, a hippo in the penguin pool) while keepers chase them with nets. Who opened the gates? (Spoiler: the goose.)
- **Mechanic:** every escaped animal you find gets walked home, so the empty enclosures fill back up as you play. The zoo itself is the progress bar.
- **Alive:** animals everywhere, keepers one step behind, a toddler happily hugging a crocodile on the stairs, a school trip in matching hats with one extra child (a penguin).
- **Shape:** round and tall: a ring path on every terrace, the train around the bottom, a cable car and a stair up the front, the giraffe house on the summit (the roof didn't account for the necks). Merges the sketchbook's Loop and Hill.
- **Layout (sketch):** a round hill in four terraces. Bottom ring (the train runs round its path): lions on rocks at the back right, elephants and a pond at the back left, penguins on ice with a pool at the front left, the flamingo lagoon at the front right; the gift shop, the café and the ice cream van on the outer rim; the gate and a stair straight up the front. Second ring: the hippo pool at the back, pandas in bamboo at the front left, the sloth's tree at the front right. Third: goat rocks. Summit: the giraffe house. A cable car runs from the front left up to the summit.
- **Needs:** Terrain (E4), Animals (E6). Could become a real zoo later.

### The Crossing (Maasai Mara, Kenya)
- **Spin:** not a zoo: the real thing. The great migration piles up on one bank of the Mara River and crosses on the clock, past the crocodiles, while the tourists cause a traffic jam around one sleeping lion.
- **Mechanic:** the herd crosses the map on the loop, so what's hidden in the herd (one wildebeest is a goose) and on each bank changes with the time.
- **Heroes and jokes:** eleven jeeps around one sleeping lion; a leopard in a tree nobody has noticed; a tented lodge with an infinity pool facing the crossing; balloon breakfast at dawn; hippos, unimpressed; vultures waiting on a dead tree.
- **Shape:** wide: the river winding across the middle, steep banks, plains either side.
- **Layout (sketch):** the Mara River winding across the middle between steep banks; the herd massing on the far (back) bank and crossing in the middle, crocodiles waiting there, hippos downstream to the right; the tented lodge and its pool at the back right, elephants at the back left, a dead tree of vultures, balloons over the back; the jeeps ringed round the sleeping lion under an acacia at the front left; rocks with lions, and the leopard's tree, at the front right, giraffes beyond.
- **Needs:** Terrain and water (E4), Animals (E6). Keep the cast to animals, guides and tourists.

### The Catminium (cats own the humans)
- **Spin:** an apartment building where cats are the owners and humans are the pets. Humans asleep in giant cat beds, a human at the vet getting a cone, a cat landlord collecting rent, humans begging under the table at a cat dinner party, a human knocking a glass off a counter while making eye contact.
- **Alive:** cats lounging, humans being walked on leashes, the building's laser pointer war.
- **Shape:** a building seen from outside, windows and balconies (the facade reference), or cut open.
- **Needs:** Today + Animals. **Replaces the Walk-Up** (now retired from the picker): same "neighbors" idea, a far stronger concept.

### The Pyramid Scheme (ancient Egypt)
- **Spin:** the pharaoh's pyramid is behind schedule and over budget. The architect's plans are upside down, the workers are on strike, the Sphinx is getting a nose job, and the mummy workshop has a customer who isn't quite dead. Find the saboteur.
- **Alive:** blocks dragged on rollers, boats on the Nile, crocodiles, a mummy-wrapping line, a camel traffic jam.
- **Shape:** the pyramid cut open (chambers and tunnels), with the Nile and the building site around it.
- **Needs:** Terrain.


### Departures (an airport)
- **Spin:** an airport with the terminal cut open. A lost suitcase rides the belts across the whole map, and the security X-ray lets you see inside bags.
- **Mechanic:** the X-ray: tap the scanner to see inside a bag.
- **Heroes and jokes:** the departures board where every delay grows; a family sprinting to their gate; the control tower; a goose on the runway (obviously).
- **Shape:** wide: landside road, the terminal, the apron and planes, the runway in front.
- **Layout (sketch):** the landside road and taxis along the back; the terminal cut open along it, left to right: security, the departures board and shops, two gates, baggage reclaim; jet bridges out to three planes on the apron, a belt from the terminal to the first plane's hold; baggage carts and the control tower on the right; the runway along the front with a plane taking off and a goose on it.
- **Needs:** Today. Could be Logan later, to sit with the Boston places.
## Spins on the inspiration

- **The Deep Shift** (chasm, ref 3/19): a mining town down a canyon wall, with the miners digging into something that's digging back.
- **Night Shift** (neon alley, ref 14): a neon city block where every shop is a front for something else.
- **Inside the Goose** (floor plan of the mind, ref 15): the finale. Honk Control, the Bread Department, the Archive of Grudges, and a memory from every place you've played.
- **The Dig** (earth cube, ref 13): an archaeology dig where the cut sides show every era stacked underneath, down to a dinosaur that isn't entirely dead.

## The shared universe

Characters and things that turn up everywhere:
- **The goose**, in every place.
- **The Courier:** a parcel for "G. Goose" hidden in every place.
- **Inspector Pidge:** a pigeon detective always one place behind the goose, and always wrong.
- **A fake brand** on posters, trucks and packaging across every place: **Gander Cola** ("Take a gander."), red cans, white lettering. First on Plum Island's banner plane (plum.md, 5c).
- **"Have you seen this goose?" posters** (the Block's blimp already has one).
