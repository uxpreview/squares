# The Farm

> Status: **Greybox** · Brief → Greybox → Art → QA → Preview → Shipped
> Approvals: brief [x] (the lead's call, decisions 1 to 18, after the owner answered questions 1 to 3 and 9, October 30) · greybox [x] (the lead's call, decisions 19 to 31, October 30) · preview [ ] (the owner)
>
> October 30, 2026. Gate 1, drafted after a look at the real place in the browser: Historic New England's pages for the farm, its animals and its wedding rentals, its drone film of the grounds, OpenStreetMap's survey of the farm (which names the archaeologists' dig areas and fields), the satellite view, news on the vintage base ball league, and the archaeology. Then the owner's answers: they were married here, their family volunteers with the animals on weekends, and they sent four photos of where the wedding happens. Nothing is built yet. The working id is `farm`.
>
> Session 24 (October 30, 2026): the engine pieces (the dig square, E6's first slice, the land) and the greybox, at `#/farm`, hidden from the picker. `npm run qa -- farm` passes. Gate 2 was the lead's call (decisions 19 to 31). Next session: the art.
>
> **How to read it:** **[K]** means checked against a source (listed under "Real places, checked"), and **[O]** means the owner told us. **[G]** means a guess, or something we made up for the game. Everything about the double-booked Saturday is ours.

New places were meant to wait for v2 (STRATEGY.md, phase 3). The owner chose to build this one now, in its own session, without waiting for 18b (question 9, decision 16).

## In one line
A Saturday in June at a 1690 farm in Newbury that has booked a wedding, a vintage base ball game, sheep shearing and an archaeology dig on the same day. Foul balls land in the cake, a half-sheared sheep joins the wedding, and Roger the donkey gets into every photo.

## The story
A light story, like Plum Island's and Departures': it runs across the map and never gets in the way of the geese. The goal is every goose (one per area) and most of the things.

**The setup.** Spencer-Peirce-Little Farm, the third Saturday in June. The calendar in the visitor center has four things written on Saturday in four different pens: a WEDDING (the field), BASE BALL (the field), SHEARING (the barn) and DIG (everywhere). Nobody will move. The wedding has paid. The base ball league has played here every summer. The sheep need shearing. And the archaeologists were here first: they've been digging this farm since 1986 *(dates [K]; this Saturday's dig [G])*.

**The twist (for the team; players piece it together).** The groom booked the ball game. He pitches for the home side, the game falls on his wedding day, and he has a uniform on under his suit. He plays game one, changes for the ceremony, says "I do", and runs back out for extra innings. The bride knows. She booked the shearing, because she wanted sheep in the photos.

**The dig.** A field school is back for the day with its squares open all over the farm. Every layer of this farm is somebody's party: the 1788 spring dinner whose bones turned up in a cellar stairwell, an owner around 1800 who fed eighty at a time, the Littles' dairy, and now a wedding for 250 *(the history [K]; the line [G])*. The wedding cake has three tiers and the trench by the house has three layers, and both get dug into by the end of the day.

**The Courier** has a parcel for "G. Goose, Spencer-Peirce-Little Farm". He comes up Little's Lane at nine and tries the shearing ("We're shearing."), the dugout ("We're batting."), the dig ("We're in 1788."). By six he's been seated at the wedding at table 12, and at nine he catches the bouquet. The parcel is a gravy boat from the registry. He's sure Geraldine is the bride.

**The ending.** Find every goose and most of the things and the clock jumps to 10pm: the sparkler send-off down Little's Lane. The couple runs the lane between two lines of sparklers, and the geese run it after them in a line. The photographer, who has had a goose in every shot all day, takes the last photo of the night. It's Roger and every goose, with the couple out of frame. The card shows it.

## Shape
- **We're looking northeast,** from over Little's Lane toward the Great Marsh and the sea. The lane comes in from the front left (from High Road, Route 1A), the house and barns sit in the middle, and the fields run back toward the marsh in long stripes. The Merrimack's flats are at the back left, with Newburyport's steeples beyond them. The airfield and the woods are at the back right, and Plum Island's dunes and lighthouse are on the far horizon. June's sunset is on the left, behind the barn *(directions [K], from the satellite and OpenStreetMap)*.
- **The hero:** the wedding tent. It's a big white tent with peaked poles, the biggest and whitest thing on the map, and it dwarfs the 1690 house beside it. That's the joke: the oldest stone house in New England upstaged by a rental. **Second landmark:** the dig's big trench by the house, its side cut open like a slice of cake to show the layers (the 1900s, the 1800s, 1690). It's the verb, visible in the thumbnail.
- **Silhouette,** the known weak spot, since a farm is flat. Its shape comes from five things: (1) the stripes, long rows of crops running back into the picture like a comb (they really are striped, [K]); (2) the white peaks of the tent; (3) the house's steep roof and big central chimney, and the long barn roofs; (4) a dark band of woods on the right; (5) the back edge, which frays into the Great Marsh, its creeks, the Plum Island Turnpike on its causeway and the runway sticking out at the back right. A cut slab with the layers in its front face was considered and dropped: a slab on paper breaks the "the picture runs to every edge" rule (decision 4).
- **The paper is a June meadow.** The fields run off the front and side edges into the paper's own green-gold, and the marsh and river run off the back.
- **On a phone** held upright, the overview fills the height around the house, the ball field and the tent, with the barn and the fields running off the sides, a swipe along them. On its side, the whole farm.
- **Real geography, compressed, never rearranged.** The real farm is about 1.2 km from High Road to the airfield. Little's Lane (about 430 m) and the stripes are squeezed hardest; the buildings, the paddock and the ball field keep their real places around the house.

The plan, in units (x left to right, northwest to southeast; y back to front, northeast to southwest). 96 x 72, about 12 m a unit. The greybox tunes it.

| y ↓ / x → | 0 to 34 | 34 to 64 | 64 to 96 |
| --- | --- | --- | --- |
| **0 to 16** | **The Marsh Edge:** the Merrimack's flats at the back left, the refuge's visitor center and the bird center on the turnpike | **The Marsh Edge:** a band of woods, then the turnpike on its causeway over the marsh | **The Marsh Edge:** the airfield, the runway's end, the hangar and the windsock |
| **16 to 36** | **The Wedding Field:** the tent in the big lawn north of the barn and the house, woods behind it, the hen coop at its edge by the house | **The Ball Field:** the diamond on the mown lawn northeast of the house | **The Fields:** the stripes, the farm track |
| **36 to 54** | **The Barn:** the loop drive, the 1775 barn, the carriage barn (the visitor center), the lot | **The House:** the stone house, the farmhouse behind it, the ceremony on the front lawn facing the brick porch, cocktail hour on the lawn toward the barn, the yard dig and the trench, the old maples | **The Fields:** the orchard, Bowman's Pond |
| **54 to 72** | **Little's Lane:** the lane in from High Road under its trees, the parking field | **The Paddock:** the gated lot south of the lane as it reaches the house, the pigs' pen beside it | **The Fields:** the stripes run off the front edge |

Where the wedding goes is the owner's, from their photos *([O])*: the ceremony is on the lawn in front of the stone house, rows of chairs either side of a grass aisle, the arch of flowers at the brick porch's door, so the 1690 house is behind the couple. Cocktail hour is on the lawn beside the house, between its stone gable end and the white barn. The tent stands in the big lawn beyond the barn and the house, with the woods behind it, and the hen coop sits by the house at the field's edge. The farm's drone film shows the rest *([K])*: the lane comes in under a double row of big old trees, the big white barn on its left, the paddock's fenced lot and shelters on its right, the house at the end in its trees, the fields and the woods beyond, and Plum Island and the sea on the horizon.

## Areas
Eight, each one area of any shape (E5) on one open map (`open: true`). The Fields is the quietest; the greybox can fold it into the Marsh Edge if eight is too many to fill.

| Area | What's happening | Running gag (plays out over time) | Finds |
| --- | --- | --- | --- |
| **Little's Lane** | The lane in from High Road under a line of old trees, the farm's sign, the parking field where a volunteer with three colored flags sends everyone (wedding, base ball, sheep) to the same spot. From 2pm the bride's photos on the lane, the official backdrop *([K]: Historic New England calls the lane "the perfect backdrop for wedding photos")*. The getaway truck with cans on strings | **The photographer:** every shot has a goose in it. The goose walks into frame, the photographer turns to look, and it's gone. Roger walks into frame instead. "One more." **The car cat:** one of the barn cats tries every car door in the parking field, all day *([O]: she really does)*. At seven one's open, and she's asleep on the getaway truck's dashboard by nine | A goose; a wedding ring; a draft horse's shoe; a bouquet; a parking flag |
| **The Barn** | The 1775 barn (shearing day: the shearer with clippers, a pen of woolly sheep, a pen of bald ones, families on hay bales, a wool table), the carriage barn's end, which is the visitor center, with its museum, the double-booked calendar and **the display case**, the loop drive and the lot, barn cats, swallows | **Shearing:** sheep go in woolly and come out bald, one an hour. At 3pm one gets away half done and heads for the wedding, where it stands with the bridesmaids for the rest of the day. **The display case** fills up as you find things in the dig | A goose; a barn cat; a clay pipe; a pair of shears; a sock being knitted |
| **The Paddock** | The rescue animals in their real arrangement *([O])*: two donkeys (one is Roger, [K]), goats and sheep together in the main gated lot with their shelters, and two big pigs in a pen of their own beside it. The weekend volunteers feeding and mucking out *([O]: the owner's family is among them)*, kids at the fence, the camera on a pole that streams the paddock live *([K]: there's a livestream)* | **The welcome sign:** the goats eat the wedding's sign one letter at a time. WELCOME TO OUR WEDDING at 8am, WELCOME TO OUR WED at noon, WELCOME by four, W by night. **Roger** gets out at two for the photos, stands behind the couple at the ceremony, and is home by dark | A goose; a centerpiece; an egg; a pig in a boutonniere; a milk bottle |
| **The House** | The 1690 stone and brick house (brick porch and gable ends, the big central chimney), the wooden wing, the farmhouse behind it through the breezeway (the Stekionis family's home for most of the 1900s), the well pump by the kitchen, the tour guide's tours on the hour from 11 to 4 and the ten-minute tours at cocktail hour *([K] all)*. **The ceremony** on the front lawn: rows of chairs either side of a grass aisle, the flower arch at the porch door *([O])*. Cocktail hour on the lawn toward the barn. The main dig in the yard, in its real places (the East Yard, the West Yard by the scullery, the Flower Garden, the East and West Fronts, [K]), Boardman's privy, the trench, the sifting screens, the old maples | **The dig:** the archaeologist's sign says DO NOT STAND IN THE 1800s. At 3:30 the bride's heel goes through a square and stays in the 1800s for the rest of the day. **The ten-minute tour** at cocktail hour goes in at five and comes out at quarter to six. And all evening, as the line for the portable toilets grows, one guest eyes the 1800 privy | A goose; a bride's shoe; a hair restorer bottle; a bone from a 1788 dinner; an old signature |
| **The Wedding Field** | The tent in the big lawn north of the barn and the house, the woods behind it (sides down by day, rolled up at six, string lights at night), the cake table, the ice swan, the hen coop by the house at the field's edge *([O])* with its hens out on the lawn, the caterers' truck, the band, the bar, the row of portable toilets *([K]: over a hundred guests must bring their own)*, a square under the dance floor with a hatch | **Foul balls:** every few minutes one comes over from the ball field: the punch bowl at noon, the arch at two, the cake at 3:40 (the baker repairs it), the cake again at six. **The ice swan** melts all day, a duck by dinner and a puddle by the dancing | A goose; a base ball in the cake; the seating chart; a dance card; a lost speech |
| **The Ball Field** | A vintage base ball game on 1860s rules ([K]: no gloves, underhand pitching, a ball caught on one bound is out, players call their own outs on the honor system, long thin wooden bats, beards), the home team against the visitors, lawn chairs round the field (no bleachers), a chalk scoreboard kept by a kid, the umpire in a top hat, the groom on the mound | **The groom:** pitches game one, runs off at 3:50 still buttoning his shirt, runs back at 4:40 in his suit for extra innings, and at 6pm the last out is caught on one bound off the wedding cake. The fielder calls it, the umpire agrees, and both teams clap | A goose; a fake beard; a glove; an 1860s base ball; a broken bat |
| **The Fields** | The leased fields in long stripes (strawberries in June), the farm track, the tractor, Bowman's Pond, the orchard, the walking trail with dog walkers and a cyclist, the woods toward the airfield, a scarecrow | **The scarecrow** gets dressed in everyone's lost things through the day: a ball cap at noon, a fleece at three, a bridesmaid's shawl at six, a tie at nine. **The tractor** needs to get past the wedding and waits all afternoon | A goose; a strawberry basket; a coin from the 1600s; a frog; a lost sneaker |
| **The Marsh Edge** | The Plum Island Turnpike on its causeway, beach traffic to Plum Island all day, the refuge's visitor center and the bird center on the north side with birders and scopes, the Great Marsh and its creeks, salt hay on staddles, the Merrimack's flats at the back left, greenhead traps (the first flies are out), the airfield ([K]: Plum Island Airport, right next to the farm, its runway pointing at it) with a hangar, a windsock and a small plane | **The plane:** a small plane takes off on the hour, low over the farm. At 4:02 it goes over the vows, and the whole wedding stops and waits for it, as Plum Island's road waits for the drawbridge. The Gander Cola banner plane leaves from here at noon. **The birders** swing every scope at the goose and miss it | A goose; a greenhead trap; a hay fork; a kite in a tree; a birder's thermos |

## Cast
- **The bride,** a vet who wanted sheep in her photos and booked the shearing to get them. Sweatshirt over the dress until two.
- **The groom,** the home team's pitcher, in a uniform under his suit all day. Underhand, as the rules say.
- **The photographer,** with a goose in every shot. Her lines: "One more.", "Was that a goose?", "One MORE."
- **The archaeologist,** the field school's leader, with a trowel, a hat, a clipboard and a string line round every square. She was here first.
- **Her students,** in their squares all day; they sieve, label bags, and lie in the trench for lunch.
- **The shearer** and the family helping at the wool table.
- **The tour guide,** on the hour.
- **The parking volunteer** with three flags and one field.
- **The weekend volunteers** at the paddock with buckets and a wheelbarrow, feeding, mucking out and answering kids' questions. The owner's family is among the real ones *([O])*, so they're drawn as people who know every animal's name.
- **The baker,** who repairs the cake twice.
- **The umpire,** in a top hat, generic (question 7).
- **The Courier,** the shared universe's, with his parcel.
- **Inspector Pidge,** at the wedding uninvited, his place card reading PIDGE (+0), sure the goose is a guest.
- **Animals** (see "Animals and E6"), as the owner knows them *([O])*: two donkeys (Roger and a friend; question 10), goats and sheep sharing the paddock, two big pigs next door, hens from the coop by the house, and two barn cats who wander everywhere, one of whom tries to get into visitors' cars; the flock being sheared; swallows in the barn; egrets and a heron on the marsh; Canada geese on the pond; fireflies after dark.
- **Cameos from Plum Island,** on the turnpike: Every King Tide Dave in his red pickup, and the sunbather in red shorts, walking to the island at 7am, as he does.
- **The crowd:** about forty wedding guests on show (question of speed, below), a few dozen base ball fans in lawn chairs (some in period dress), shearing-day families, dog walkers, birders.

## Palette and plate
A June plate: green-gold fields, earth in layers, fieldstone, brick, and one big white tent. It shares the North Shore inks with Plum Island and the Newburyport idea (plum.md, Palette), so the three print as neighbors. Draft inks for the art director:

- Meadow `#B9C77A`: the fields at a distance, **and the paper** (the fields run off every edge)
- Pasture `#7FA05A`: mown lawns, the crop stripes, the woods a shade deeper
- Earth `#8A6A4F`: the dig, in three depths (the 1900s light, the 1800s middle, 1690 dark)
- Fieldstone `#A49A8B`: the 1690 house's rubble walls, the stone walls
- Brick `#B5654A`: the house's porch and gable ends *(shared: the North Shore inks)*
- Cream `#F4EAD5`: the tent, the sheep, the chairs, the ice swan *(shared)*
- Marsh `#9DB36B` and Sea `#3F8FA6`: the Great Marsh, the creeks, the river, the pond *(shared)*

Line ink stays the game's navy. The plate follows the day (`plate.at(t)`): pale at dawn, bright at noon, gold at sunset behind the barn, then a night printed in dark ink with the tent glowing from inside, string lights, the barn's door lit and fireflies over the fields.

## Alive
A six-minute loop from 5am on the Saturday (it slows for the afternoon and evening, and hurries through the night):

| Loop | Hours | What's going on |
| --- | --- | --- |
| 0:00 to 0:25 | 5am to 8am | Dawn over Plum Island. The tent crew raises the tent, the archaeologists open their squares, the tractor heads out, hens out, the sunbather walks the turnpike |
| 0:25 to 1:30 | 8am to 1pm | The farm fills: the Courier at nine, shearing from ten, game one at eleven, caterers, the goats start on the sign, the banner plane at noon |
| 1:30 to 2:50 | 1pm to 4pm | Game two. The bride at two, photos on the lane, Roger out. The heel at 3:30, the cake at 3:40, the groom runs off at 3:50 |
| 2:50 to 3:40 | 4pm to 6pm | **The ceremony** at four (the plane at 4:02), cocktail hour at five and the ten-minute tours, extra innings, the last out off the cake at six |
| 3:40 to 4:50 | 6pm to 10pm | The tent's sides roll up: dinner, speeches, **sunset** at about 8:25 behind the barn, the bouquet at nine, dancing, **sparklers at ten** (the ending's moment) |
| 4:50 to 5:40 | 10pm to 1am | The tent glowing, the last dance, fireflies, the barn cats, the archaeologist backfilling by headlamp |
| 5:40 to 6:00 | 1am to 5am | The night, in twenty seconds |

- **Things that travel the map:** the Courier; Roger; the barn cats (one to the parking field, one along the stone walls); the half-sheared sheep from the barn to the tent; foul balls; the groom between the mound and the arch; the tractor along the track; traffic on the turnpike; the planes.
- **Sound bed:** a farmyard (sheep, hens, a bray now and then), the crowd at the game and the crack of a wooden bat, clippers in the barn, the band far off then near after six, the plane on the hour, wind in the marsh grass, peepers and crickets after dark. All under a honk, measured (`node tools/sound.mjs farm`).

## Mechanic
**Dig.** The archaeologists' squares are open all over the farm, two or three in every area and five round the house where the real digs were. A tap takes a square down a layer:

| Taps | Layer | What's in it |
| --- | --- | --- |
| 0 | **Today:** grass, a string line, a label | whatever got dropped today |
| 1 | **The 1900s:** the Littles' dairy and draft horses | a milk bottle, a horseshoe, a dance card |
| 2 | **The 1800s:** the merchants' country seat, patent medicines | hair restorer bottles, clay pipes, Boardman's dinner plates |
| 3 | **1690 to 1799:** the stone house going up, the 1788 spring dinner | a bone from that dinner, a coin |

Another tap fills it back in. Each layer says its name as it opens ("The 1800s.", "1690. Careful.") and the empty ones answer back ("Dirt. Very old dirt."). A find in a square is only there at its layer, so the hint's first line names the layer ("Two layers down, near the scullery"). Everything you dig up appears in the **display case** in the visitor center, with a label ("Hair restorer, 1870s. It didn't.").

Nothing in the game goes down rather than open, so this is new to the engine (a poke with steps; "Engine and kit needs"). The clock still matters too: the heel, the cake's base ball and the ring arrive at their hours and stay till dawn.

The deepest layer in the game is 1690. The farm's real dig also found a Native site, from the Pawtucket and Penacook peoples who lived here first *([K]: Historic New England's page)*. That isn't a joke or a find. The dig's sign says so in one plain line (decision 11).

## Finds
One goose and four things per area (8 geese, 32 things). Dig finds are poke finds (a square to tap down), and say their layer. Kinds per the rules (about half spot, a third poke, one or two hard, the goose never spot). Final wording and spots at the greybox.

| Area | Goose | Things |
| --- | --- | --- |
| Little's Lane | Under the tarp in the getaway truck's bed *(poke: the tarp; a tail shows)* | A wedding ring *(hard, from 2pm: in the spoil heap by a square; riddle: "Something round fell where the photographer said one more")* · A draft horse's shoe *(poke: the 1900s)* · A bouquet *(spot, from 2pm: on a fence post)* · A parking flag *(spot)* |
| The Barn | In a wool sack, head out *(poke: the sack)* | A barn cat *(hard: eyes on a beam in the dark; riddle: "Two eyes in the rafters, watching the swallows")* · A clay pipe *(poke: the 1800s)* · A pair of shears *(spot)* · A sock being knitted *(spot)* |
| The Paddock | Lying down with the sheep, white on white *(hard; riddle: "One of the flock has a beak")* | A centerpiece *(spot, being eaten)* · A carrot *(poke: the donkeys' feed bin)* · A pig in a boutonniere *(spot)* · A milk bottle *(poke: the 1900s)* |
| The House | Behind a sifting screen *(poke: the screen shakes; feet show)* | A bride's shoe *(spot, from 3:30)* · A hair restorer bottle *(poke: the 1800s)* · A bone from a 1788 dinner *(hard: the 1690 layer of the square by the scullery)* · An old signature *(poke: the attic, when the roof lifts; it reads G.G. 1690)* |
| The Wedding Field | Under the cake table's skirt *(poke: the cloth lifts)* | A base ball in the cake *(spot, from 3:40)* · The seating chart *(spot; table 12 is the Courier's)* · A dance card *(poke: the hatch in the dance floor, the 1900s)* · An egg *(poke: the coop's nest box)* |
| The Ball Field | In a lawn chair among the fans *(hard; riddle: "One of the fans cheers for both teams and honks for neither")* | A fake beard *(spot, on a string)* · A glove *(poke: a player's bag; gloves are against the rules)* · An 1860s base ball *(poke: the 1800s, in foul territory)* · A broken bat *(spot)* |
| The Fields | Swimming with the Canada geese on the pond *(hard)* | A strawberry basket *(spot)* · A coin from the 1600s *(poke: the 1690 layer)* · A frog *(spot, on a lily pad)* · A lost sneaker *(poke: the scarecrow's coat)* |
| The Marsh Edge | In the cockpit of the plane in the hangar *(poke: the hangar door rolls up)* | A greenhead trap *(spot)* · A hay fork *(poke: a salt hay staddle)* · A kite in a tree *(spot)* · A birder's thermos *(spot)* |

Which ones are real: the hair restorer bottles, the 1788 dinner's bones and Boardman's dinner plates are real finds from the farm *([K]: Beaudry's digs)*; the horseshoe and the milk bottle are real history (draft horses and a dairy, [K]) but made-up finds; the clay pipe, the coin and the 1860s base ball are plausible inventions *([G])*. The rest is the day.

**Things that answer a tap** (two or three an area, one marked `teach` on the lane): the photographer ("One more."), the parking volunteer ("Wedding, base ball or sheep? Same field."), the farm's sign; the calendar ("SATURDAY: wedding. SATURDAY: base ball. SATURDAY: shearing. SATURDAY: dig. Someone has a lot of pens."), the display case, the shearer; Roger ("Not in the mood."), the volunteer ("That's Roger. He's not in the mood."), the livestream camera ("LIVE. 4 watching. 3 are goats."); the well pump, the tour guide ("Next tour on the hour. Mind the 1800s."), the house's roof (the attic); the band, the bar, the caterers' truck (a lost speech: "Unaccustomed as I am..."), the hens; the chalk scoreboard, the umpire ("Fair. Probably."); the scarecrow, the tractor driver ("Still waiting."); the windsock, a birder's scope. **Every square** answers too.

**Decoys,** one an area: a lawn goose in a veil (Little's Lane: "Here comes the... no."), a fleece on the barn floor that fell in a goose shape ("It just landed like that."), a goose weathervane on the shelter's roof (the Paddock: "Points where the wind goes. Unlike some."), a cast-iron goose doorstop on the porch ("Heavier than you."), the ice swan (the Wedding Field: "A swan. Made of ice. Leaving soon."; a white hen by the coop answers too: "That's a hen. She's heard of you."), a kid in a goose costume, the team's mascot (the Ball Field: "That's Owen."), an egret on the pond ("Different department."), a Canada goose on the marsh ("She's not from around here.").

## Shared universe
- **The goose** in every area, on the parcel, in the attic (G.G. 1690), and in the last photo.
- **The Courier** and his gravy boat, at table 12, catching the bouquet.
- **Inspector Pidge** at the wedding, uninvited.
- **Gander Cola:** the banner plane takes off from the airfield next door (it's the one that flies over Plum Island's beach), and cans in the fans' coolers.
- **A "Have you seen this goose?" poster** on the visitor center's board.
- **Plum Island:** its dunes and lighthouse on the horizon, the turnpike's traffic, Dave and the sunbather. This is the mainland end of Plum Island's turnpike, seen from the other side, and the airfield is the one in Plum Island's picture.

## Tone
Affectionate, like a good wedding toast. The owner was married here, and their family looks after these animals on weekends *([O])*: the wedding is the heart of the place, and the animals are drawn the way the volunteers know them. The jokes are about the double booking and everyone refusing to give way: sheep, base ball, cake, toilets, the tour that won't end. Real people stay real and kind. The Littles and the Stekionis family are history told in the house and the display case, never punchlines. The game's people are made up: no real umpire, couple or archaeologist. The real umpire many locals knew died in 2024 (question 7). The Native site is acknowledged plainly and never played for laughs. The darkest joke is the 1788 dinner's bones, and it's history, not gore. The pigs at the fence are rescues and stay safe; no farm animal is ever on a menu. The bride's heel, the cake and the swan get the worst of it.

## Real places, checked
Checked October 27 to 30, 2026, in the browser: Historic New England's pages for the farm (its history, FAQ, animals and wedding rentals, and its drone film of the grounds; the events calendar sits behind a bot check and wasn't read), OpenStreetMap (its survey of the farm names the dig areas and the fields from Beaudry's 1995 report), the satellite view, a 2026 Christian Science Monitor piece on the base ball league, and summaries of Mary Beaudry's digs (her 1995 report, "Scratching the Surface", is open access but wouldn't load here). Businesses are lookalikes with no names; public places use their real names (LEVELS.md, "Real places").

| Place | What's real | How we show it |
| --- | --- | --- |
| **The house** | Built about 1690 by Col. Daniel Peirce, "down a long elm-lined allée". Local stone, some likely hauled from the lower end of Plum Island. Brick porch and gable ends, central chimney (its arches survive in the cellar), Georgian windows replaced the arched ones in the 1700s. Said to be the only 17th-century stone house in New England with its outside walls intact. National Historic Landmark | The middle of the map, by name |
| **The wing and the farmhouse** | Added about 1800 by Offin Boardman, a privateer who lost his wharf in the 1811 fire and died in debt in 1812. The farmhouse, joined by a breezeway, was the Stekionis family's home: Jacob came from Lithuania in 1912 as a hired hand, went back to marry Dorothy, and they raised three daughters there; Dorothy lived there until 1993 | Behind the house; its kitchen window lit in the evening |
| **The owners** | Spencer (granted 1635), the Peirces (1651 to 1778), Newburyport merchants (Tracy, Boardman, Pettingell), the Littles from 1851 (bought 1861; a dairy and draft horses; the last Little women lived here till 1986), Historic New England since 1986 | The display case and the tour guide's lines |
| **The barns** | The barn northwest of the house, built 1775. The visitor center is the end of a carriage barn, about 1850, round a loop drive | The Barn, as they stand |
| **The paddock** | Rescue animals with the MSPCA since 2003: Roger the donkey, sheep, goats, chickens, pigs and barn cats (the animals page; the main page and the drone film, five years old, also show a horse). A livestream of the paddock. The satellite and the drone film show a fenced lot with shelters south of the lane where it reaches the house. **Today, from the owner:** two donkeys, goats and sheep together in the main gated lot, two big pigs in their own pen beside it, a hen coop on the side of the house near the field, two barn cats roaming, one of whom tries to get into visitors' cars *([O])* | The Paddock, there, as the owner describes it; no horse |
| **The digs** | Beaudry and Boston University, 1986 to 1994. Named areas round the house: East Yard, Scullery / West Yard, Flower Garden, East Front, West Front. Boardman's stone-lined privy (Feature 6), found from the 1812 estate map; his dinners for eighty; a Masonic plate. Hair restorer and dye bottles along a fence line; patent medicines replacing home herbs; a 1788 spring dinner (suckling pigs, pigeons) in a blocked cellar stairwell. A Native site | Squares in those places, the privy, the trench. **No dig runs today** that we know of: this Saturday's field school is ours |
| **The ball field** | The Vintage Baseball Field on the mown lawn east-northeast of the house (OpenStreetMap). The Essex Base Ball Organization plays May to October: Newburyport Clamdiggers, Lynn Live Oaks, Lowell Base Ball Nine, Essex Base Ball Club, Portsmouth Rockinghams. 1860s Massachusetts rules, no gloves, one bound is out, underhand, honor system, $5, lawn chairs, a chalk scoreboard. A past opening day was paired with sheep shearing | There, with the home team and the visitors (question 5) |
| **Weddings** | May to October except July. "Exclusive use of the wedding field", a freestanding tent for up to 250, the visitor center after 5pm, ten-minute house tours at cocktail hour, extra toilets over a hundred guests, Little's Lane for photos. **Where, from the owner's photos** *([O])*: the ceremony on the lawn in front of the stone house, facing its brick porch, the arch at the door; cocktail hour on the lawn between the house's gable end and the white barn; the tent (a white pole tent) in the big lawn beyond, woods behind it, apple trees and a small shed nearby | The ceremony in the House, the tent in the Wedding Field. The owner offered to pin the exact spot on a map if the greybox needs it |
| **Little's Lane** | Off High Road (Route 1A), about 430 m to the house, a double row of big old trees on the satellite and the drone film, the barn on its left and the paddock on its right as it reaches the house | Squeezed to about 20 units |
| **The fields** | About 230 acres in long stripes, leased to commercial growers (a farm stand business south of the farm farms some; its field hosted Newbury's midwinter Christmas tree bonfire until 2025). Names from Beaudry: North, East Hay, West, Southeast, Walsh (Dick Walsh grew flowers there) and Turnpike Fields. Bowman's Pond and orchards to the southeast. The Eliza Little Trail loops them. Walking, skiing, biking and riding on the grounds, dawn to dusk; no metal detectors | The Fields; the grower is a lookalike with no name |
| **The edges** | North: woods, then the Plum Island Turnpike, the Parker River refuge's visitor center and Mass Audubon's Joppa Flats center on it, salt marsh, and the Merrimack about 600 m away. East: woods, then Plum Island Airport (its runway about 700 m from the house), then marsh to the Plum Island River. West: High Road and houses. South: more fields | The Marsh Edge. Wikipedia says the land "borders the Merrimack and Plum Island Sound": loosely true, through the marsh. We show marsh, not shore |
| **Nearby, off the map** | The Upper Green (the 1642 militia ground), the fire station and the old burying ground up High Road to the northwest; the Coffin House (1678) further north; Old Town Hill to the south | Not drawn |

## Animals and E6
The farm is the cheap first step toward a non-human cast (ROADMAP E6), which the zoo, the Catminium and the Mara reuse.

**Drawn like Departures' gulls** (in an area's own art, a pure function of the clock, marked `anim`; no engine work): the hens pecking round their coop, the two pigs in their wallow, the goats on their spool and at the sign, the sheep in the paddock with the goats and in the shearing line, the second donkey at home, swallows, egrets and the heron, the Canada geese on the pond, fireflies. Each stays inside its own area.

**Needs a slice of E6 first** (built before the greybox, in its own commits):
- **An animal kit,** shared, not per level: a four-legged body with a walk, stand, graze and lie down, drawn in the game's print, with heads and sizes for a donkey, sheep (woolly, half-sheared and sheared), goat, pig, dog and cat. Plus a hen. People are drawn by `person()` in `art.js`; animals get the same kind of helper, so the zoo starts with them.
- **Animals who cross the map on the clock:** Roger, the half-sheared sheep, the two barn cats (one making her rounds of the parked cars) and the dog walkers' dogs, walking area to area like the Courier (`schedule()` already moves anyone; what's new is drawing an animal there and handing it between areas).
- **QA counts animals:** `covered` checks animals drawn inside solid things as it does people, and the walking check (through doors and gaps, never walls or fences, never faster than a run) covers them.
- **Animals who answer a tap:** Roger and the hens are pokes; that works today.

**Left for the zoo:** a scale per place (the farm's animals are at people scale), big herds, animals as a whole cast.

## Engine and kit needs
- [x] **Dig squares: a poke with steps.** *Built in session 24 (decision 21).* `R.poke({ steps: 4, ... })`: a tap goes down one step and a tap at the bottom fills it back in; draw with `poke.step()` (0 to 3) and `poke.k()` easing between steps. A find can be `inside` a square at a step (`layer: 2`) and is only tappable there; finding it pins the square at that layer. The hint's first line names the layer. QA's tap check digs down to the layer before tapping (it opens a find's container first today); the mix check counts dig finds as poke; the playtest tool taps down like a player; smoke checks that a find in the 1800s can't be tapped at the grass and can two taps down. Taps aren't saved, as today.
- [x] **The display case reads what's been found** (`R.found`, built for Departures in session 21).
- [x] **E6, first slice** (above). *Built in session 24 (decision 20).*
- [ ] **The trench:** a thing standing on the ground with a cut face drawn in layers (ground has no vertical faces, E4's one rule). Art, no engine.
- [x] **The land:** *Built in session 24 (decision 23).* nearly flat, a gentle rise at the house, the marsh low at the back with creeks, the pond, the river's flats. E4 as built; the marsh's water is a fixed level (no tide here; that's Plum Island's verb).
- [ ] **A crowd budget, for speed.** On the 2017 laptop the cost is the number of shapes Chrome replays, and people are most of it (Departures, 21b). So the wedding shows about forty guests, not 250: the tent's sides are down by day and roll up at six on the tables nearest the front. Animals count against the same budget. Measure with `node tools/fps.mjs farm` at noon and at 9pm.
- [ ] **Sound:** a farmyard bed and clippers (`beds.js`), cues for a bat's crack, a bray and the plane on the hour (Plum Island's plane cue can be reused).
- [ ] **Finale:** the Block Party's (the clock jumps, the camera flies to the lane, the card waits), with the photographer's last photo on the card.

## Decisions
The lead's calls at gate 1 (PROCESS: the owner reviews at gate 3 and can overturn any):

1. **The working id is `farm`,** and the brief is `docs/levels/farm.md`. The picker's name is question 6.
2. **The spin:** the double-booked June Saturday (a wedding, base ball, shearing), plus the archaeologists, who were here first. The groom booked the game.
3. **The verb is dig** (a tap goes down a layer). It moves here from Beacon and Arlington in LEVELS.md, where "things under the snow" was a weaker fit.
4. **No slab.** The silhouette comes from the stripes, the tent, the roofs, the woods and the marsh at the back, not a cut front face, which would put the picture on paper. The trench carries the layers instead.
5. **The hero is the tent,** dwarfing the 1690 house; the trench is the second landmark.
6. **Looking northeast,** from over Little's Lane, so the lane comes in at the front, the marsh and Plum Island are at the back, and the sunset is behind the barn.
7. **Eight areas, one open map,** 96 x 72; the greybox may fold the Fields into the Marsh Edge.
8. **A six-minute loop from 5am,** with the ending at the 10pm sparklers.
9. **One goose and four things per area,** 8 geese and 32 things, dig finds counted as poke.
10. **The dig stops at 1690** in the game: today, the 1900s, the 1800s, 1690 to 1799.
11. **The Native site** gets one plain line on the dig's sign and nothing else.
12. **About forty wedding guests on show,** not 250, for speed.
13. **The North Shore inks** are shared with Plum Island (Brick, Cream, Marsh, Sea), so they print as neighbors.
14. **E6's first slice** (an animal kit, animals crossing areas, QA counting them) is built before the greybox, here, so the zoo inherits it.
15. **The wedding is where the owner's was** *(the owner's photos, October 30)*: the ceremony on the stone house's front lawn facing the brick porch (now in the House area), cocktail hour on the lawn between the house and the barn, the tent in the big lawn north of the barn and the house (the Wedding Field, back left, where the first draft guessed).
16. **Built now, not after 18b** *(the owner, October 30: "start building it in a fresh session but not waiting for the Awwwards round")*. Pitch Day (ROADMAP 23, PR #53) is still waiting at gate 3, so this is two levels at once and PROCESS's rules for that apply: Pitch Day is in its last, light step while the farm is in its first; only one session measures at a time; engine changes take turns. Pitch Day's branch changes `src/engine/zone.js`, where the dig square goes too, so the farm's session brings `main` in after Pitch Day merges before it changes `zone.js`, or builds the animal kit and the land first while it waits.
17. **The animals as the owner knows them:** two donkeys, goats and sheep together, two pigs in their own pen, hens at a coop by the house, two roaming barn cats (one tries car doors, a running gag in the parking field). No horse. So the hens, the egg and the hen decoy moved to the Wedding Field's edge, and the Paddock's goose now lies with the sheep.
18. **The first session is engine prep and the greybox** (ROADMAP 24): the dig square, E6's first slice, the land, then every area blocked out with its finds, and `npm run qa -- farm` passing. The art is the session after.

### Gate 2 (the greybox, October 30): the lead's calls

19. **Engine first, in this order:** the animal kit, then the land, then the dig square. Pitch Day (PR #53) hadn't merged when the dig square was due, so the lead asked the session that started this one and went ahead: the dig square only changes `R.poke` and `R.find` in `zone.js`, and Pitch Day only changes the slab's depth there, in other functions. `main` is brought in before the PR either way.
20. **The animal kit is an engine file,** `src/engine/animals.js`: `animal(ctx, x, y, z, { kind, pose, dir, wool, color, phase }, t)`, drawn like `person()`, about ten shapes each, no halftone. Kinds: donkey, sheep (woolly, half sheared, sheared), goat, pig, dog, cat, hen; poses stand, walk, run, graze, lie, sit (a dog or a cat; anything else lies down), peck. An animal on the clock is a walker marked `animal: true`. A map can list `fences` (a line with gates) that walkers only cross at a gate; QA's walking check holds them to it and counts animals apart from people. QA's covered check looks at an animal's body as it does a person's head.
21. **The dig square** is `R.poke({ steps: 4 })`: a tap goes down a step, a tap at the bottom fills it in, `poke.step()` eases between steps (and `k()` is the share of the way down). Its lines are one per step it arrives at, the last for filling it in. A find at a `layer` can only be tapped there, and finding it pins the square at that layer (on load too); a find at a layer outside a square that deep is an error. QA digs down a tap at a time before tapping; the mix check counts squares and warns when a dig find's hint doesn't say how deep. The farm's `square()` (style.js) draws one: a hole with its layers on its walls, pegs and a string.
22. **The plan is the brief's table,** 96 x 72, eight areas (the Fields isn't folded into the Marsh Edge: the pond, the orchard, the stripes and the scarecrow fill it, and the art can fill its middle). Looking northeast, east runs straight across the screen to the right, so Little's Lane comes in from the left and runs left to right to the house.
23. **The land:** the farm at half a unit, a gentle rise of a third of a unit at the house, the marsh platform just over the water at the back, the water at one level all day. The creeks stop at the turnpike's causeway (culverts under it), which keeps the slope rule.
24. **The tent is see-through pinched in** for the greybox (solid from far out, where it's the hero), and its finds sit at its open front: the cake table, the swan, the seating chart. How the finished tent opens (its sides up at six, a roof that lifts while you're pinched in) is the art's call.
25. **The welcome sign** hangs on the paddock's fence on the lane side, where the goats can reach it.
26. **The first visit starts at the dig:** the invitation is pinned to the House ("Start at the dig", "Tap a square to dig down a layer."), and the Flower Garden's square (nothing in it) is the poke a new player is nudged to tap, not one on the lane.
27. **Finds changed from the brief at the greybox:** the egg is hard, laid out on the lawn among the hens rather than in the nest box (the Wedding Field had no hard find); the kite is hard and labeled "A kite" (the Marsh Edge had none; a hard label doesn't say where); the bride's shoe came off on the lawn by the West Front's square, where her heel is stuck (a shoe on the square sat under its tap); the scullery's square is out past the house's west end (behind the house, the house hid it).
28. **The crowd:** at most about forty wedding guests on show at once: 24 at the ceremony, 22 at cocktail hour, 24 at the tent's tables and 5 dancing, 8 lining the lane at ten. The game has 9 on the field and 12 fans; the farm has about a dozen others, 5 animals on the clock and about 25 who stay put. QA's speed check (headless, the processor slowed 4x): slowest the whole farm at noon, 45 ms against the 60 budget. Not measured yet on the owner's laptop (`node tools/fps.mjs farm`, at noon and at nine): the art session, after the art.
29. **The ending's moment is 10:09pm** (`SPARKLERS`), when the couple are halfway down the lane between the lines of sparklers.
30. **The plane** takes off on the hour from 7am to 9pm and climbs out over the farm toward the southwest, over the house at about 4:09 (the vows); it's drawn in the sky (ambient.js), not by an area.
31. **Left for the art:** the sound (a farmyard bed, clippers, a bat's crack, a bray, the plane), the night's inks (the ground isn't darkened yet, only the paper), the geese running the lane after the couple, foul balls in flight, the display case's shelves (it counts what's dug up today), the trench's cut face, and the backdrop (the marsh, Plum Island and the lighthouse, Newburyport's steeples).

## Open questions
For the owner. Each has a recommendation; the lead takes it if the owner doesn't answer, except where marked.

1. **Have you been, and what did you notice first?** *Answered (October 30):* the owner was married here, and their family volunteers with the animals on weekends. The overview keeps the house at the end of the lane, with the wedding in front of it.
2. **Which animals?** *Answered:* two donkeys, goats and sheep in the main gated lot, two big pigs in a pen beside it, a hen coop by the house near the field, two barn cats (decision 17).
3. **Where does the wedding happen?** *Answered, with photos* (decision 15). The owner can pin the exact spot on a map if the greybox needs it.
4. **The verb:** dig, four layers, the display case filling up. *Recommend:* yes.
5. **The teams' names.** The Clamdiggers and the others are real amateur clubs. *Recommend:* the home side is the Newburyport Clamdiggers by name, lettering only on the shirts (as Bob's Lobster is on Plum Island), and the visitors stay unnamed.
6. **The name in the picker.** *Recommend:* "The Farm", with "Double Booked" as the card's subtitle, and Spencer-Peirce-Little Farm by name in the blurb and the description.
7. **The umpire.** The league's real top-hat umpire, Jeff "Graybeard" Peart, died in 2024, and players wear pins with his silhouette. *Recommend:* our umpire wears a top hat (it's the period) but no long beard, so nobody reads him as Graybeard, and no tribute unless you want one. **(Yours.)**
8. **The Stekionis family** in the dig. *Recommend:* their story is in the house's tour lines and the display case ("The farmhouse, 1912 to 1993"), but no find is theirs; the 1900s layer belongs to the dairy and the horses.
9. **When to build it.** *Answered:* now, in a fresh session, without waiting for 18b (decision 16).
10. **The second donkey's name** (and the cats', if they have them). The volunteers will know. *Recommend:* "Roger's friend" in the greybox, the real names in the art if the owner shares them, since the volunteers would notice.
11. **A nod to the owner's own wedding?** A date on the chalkboard, a table name, the couple's colors. *Recommend:* none unless the owner wants one; it's theirs to give at gate 3.
