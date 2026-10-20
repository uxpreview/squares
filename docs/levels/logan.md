# Departures

> Status: **Shipped** · Brief → Greybox → Art → QA → Preview → Shipped
> Approvals: brief [x] (the lead's call, decisions 1 to 14) · greybox [x] (the lead's call, decisions 15 to 23) · preview [x] (the owner, October 20)
>
> Session 20 (October 18, 2026). The owner asked for a new map and picked Departures, or a zoo idea. The lead chose Departures (decision 1) and built it as one big map from the start (decision 3). This session wrote the brief, built the one engine piece it needs (finds that unlock after another, decision 6) and greyboxed it at `#/logan`, hidden from the picker until it ships.
>
> Session 21 (October 18, 2026): the art. The engine piece the reunions needed (`R.found`), the lead's kit, nine artists in parallel, the art director, and every area toured pinched in by four reviewers ("The art", below). Still hidden at `#/logan`. Next session: the blind playtest, `node tools/fps.mjs logan` on the owner's Mac, and gate 3.
>
> October 20, 2026 (local, the owner's Mac): the owner played it, found it laggy, and two fixes went in ("Speed on the owner's laptop", below). Then the owner opened it: it's in the picker. Gate 3 was the owner playing it on their own laptop; the blind playtest wasn't run (decision 34).

New places were meant to wait for v2 (STRATEGY.md, phase 3). The owner moved this one ahead of that on October 18, knowing the plan; ROADMAP 20 records it.

## In one line
Boston Logan on the day before Thanksgiving: every flight is late, every bag is lost, a nor'easter is coming, and there's a goose on the runway.

## The story
A light one, like the Block Party's and Plum Island's: it runs across the map and never gets in the way of the geese. The goal is every goose (one per area) and most of the things.

**The setup.** The Wednesday before Thanksgiving, the busiest travel day of the year, at Logan. A nor'easter is due at dusk. Everyone in New England is flying home with something they shouldn't have packed, and the airport is separating them from it as fast as it can: the bags go one way (the belts, the bag room, the carts, the wrong plane) and the people go the other (the queue, security, the gates).

**What the player does.** Find the goose and the things in each area, as everywhere. And **reunite** them: five of the things are lost bags, and finding one puts its owner on the list (the bag's tag says who to look for). Find the owner and they're together again. A bag and its owner are never in the same area.

**The day.** The first wave at 4am, the morning rush and the queue out the door, a quiet hour at noon, snow from three, sunset at 4:15, and at six the storm arrives and everything stops: a ground stop, every flight delayed, then canceled, except Flight 1 to Orlando, which says ON TIME all day and never boards. By night the gates are a campsite, the de-icers spray planes orange, and the plows sweep the runway in a line.

**The Courier** has a parcel for "G. Goose, Flight 1". He steps off the water taxi at 5am, is in the check-in queue till nine, through security at ten (the parcel goes through the X-ray: it's a loaf of bread), and at C12 by noon, where he waits all day for Flight 1. Inspector Pidge waits at C13, behind a newspaper, for a flight that left on Monday.

**The ending.** Find every goose and most of the things and the clock jumps to 11:57pm: the ground stop has lifted, and Flight 1 to Orlando, de-iced and finally boarded, is holding short at the end of the runway. The camera flies there. The geese cross the runway in a line in front of it, and the plane waits for them, as the tower says it must. The Courier is at C12's window, holding up the parcel: Flight 1 is leaving without him. After midnight he takes the water taxi home, to try again tomorrow.

## Shape
- **Wide, and on the diagonal,** like Plum Island. The airport runs along one axis of the map, south (the water taxi, the top left of the screen) to north (the bottom right). We're looking west from over the outer harbor, toward downtown: the curb and the roads at the back, the terminal, then the bag room and the apron, the runway along the water in front.
- **The flow is the journey** (INSPIRATION 9, the snack factory: a place can be a journey). Passengers go back to front: the curb, check-in, security, the gates, the plane. Bags go the long way round: the belts out of check-in into the bag room, onto carts, across the apron, into the holds.
- **The hero:** the control tower, Logan's real one, two tall pylons with a platform between them and the cab on top, standing at the back by the garage, so it rises against the skyline without hiding anything.
- **Silhouette:** a slab of filled land in the harbor (which is what Logan is), with the harbor biting into its corners: the water taxi dock at the back left, and at the front left the approach light pier walking out over the water on the runway's line.
- **The paper is the harbor.** The plate is Boston Harbor's water: the airport sits in it, and it runs to every edge of the screen.
- **Behind, across the inner harbor** (the backdrop): the Seaport and Castle Island to the left (Moving Day's view, the other way), downtown's towers in the middle, the Zakim to the right.
- **On a phone** held upright, the overview fills the height around security and the gates, and the airport runs off both sides, a swipe along it. On its side, the whole airport.
- **Real geography, compressed, never rearranged.** Logan's four terminals become one, Terminal C (it has the chapel); its six runways become one, the one that ends on a pier over the harbor.

The plan, in units (x along the airport from the south, y from the back to the front). 104 x 60.

| x → | 0 to 30 | 30 to 52 | 52 to 104 |
| --- | --- | --- | --- |
| **Landside** (y 0 to 12) | **The Curb**: the water taxi dock at the left end, the roadway and the curb | **The Curb**: the control tower and the garage | **The Curb**: the Silver Line stop, arrivals pick-up |
| **The terminal** (y 12 to 30), roof off | **Check-in** | **Security** | **The Gates** |
| **Airside** (y 30 to 48) | **The Bag Room** | **The Apron**: the de-icing pad | **The Apron**: three planes at the gates |
| **The front** (y 48 to 60) | **The Runway**: the light pier over the water | **The Runway** | **The Runway** |

## Areas
Seven, each one area of any shape (E5), as on Plum Island.

| Area | What's happening | Running gag (plays out over time) | Finds |
| --- | --- | --- | --- |
| **The Curb** | The departures curb and the roads behind it: taxis, rideshares double parked, the Silver Line bus, a state trooper waving everyone on, a family unloading eleven bags from one hatchback, a man saying goodbye for forty minutes, the smokers' corner. The control tower and the garage in the middle, the water taxi dock at the left end, arrivals pick-up at the right, where a family waits with a sign | **The minivan:** one minivan circles the airport all day, waved on every time it stops, the same kid's face in the back window a little sadder each lap. At night it's still going | A goose *(in a taxi)*; a pair of skis; Uncle Ray's family *(after Uncle Ray)*; a raccoon; a lost glove |
| **Check-in** | The ticketing hall: the counters, the queue that snakes through the rope maze, the bag scales, the kiosks nobody can work, the oversize drop, the belts behind the counters disappearing through rubber flaps toward the bag room. Our Lady of the Airways, the chapel, off the hall | **The scale:** a man's bag is two pounds over. He takes things out and puts them on, a layer at a time, until by evening he's wearing everything he owns. And the queue grows by the hour until it's out the door | A goose; the turkey's owner *(after the turkey)*; a pair of lucky underpants; someone praying for an upgrade; a lost passport |
| **Security** | The checkpoint: the line, the stacks of grey trays, the shoes-off bench, two X-ray belts and their monitors, the body scanner, the pat-down, the bin of things that aren't coming back (shampoo, a sword, snow globes), a sniffer dog | **The scanner:** one man has been standing in the body scanner with his hands up since 6am; nobody told him he could go. And the snow globes: confiscated all day, while outside the real snow starts | A goose *(in the shoes)*; a frozen turkey *(on the X-ray)*; the skier *(after the skis)*; someone with their hands up; a tiny bottle of hot sauce |
| **The Gates** | The concourse: three gates, C12 (Flight 1 to Orlando), C13 (New York) and C14, rows of seats, the departures board, a charging pole with nine people round it, the bar (the same man on the same stool since 8am), the food court with a lookalike of the donut chain and a $19 lobster roll, a high school marching band at C13 on its way to the parade in New York, the gate agent at C12 calling for "passenger Goose" | **The board:** every delay grows by the hour; at six they all turn CANCELED except Flight 1 to Orlando, ON TIME all day, which never boards. **The band** rehearses all day with a hole where the tuba goes. By night everyone's asleep across the seats | A goose *(at the bar)*; the tuba player *(after the tuba)*; the bride *(after the wedding dress)*; Inspector Pidge; a $19 lobster roll |
| **The Bag Room** | Under the gates, where the bags go: belts from check-in coming through the flaps, a sorting loop, a jam at the merge with a supervisor whacking it, handlers loading carts, the lost-and-found cage with everything nobody came back for since 1987, a hunting decoy someone checked | **The pink bag:** one bright pink bag rides the loop all day, round and round. Nobody claims it. At midnight it goes round once more. And one handler throws every bag marked FRAGILE the hardest | A goose *(in the lost-and-found)*; a tuba; a cat; a bag marked fragile; a set of false teeth |
| **The Apron** | Outside the gates: three planes nosed in to their jet bridges, bag carts from the bag room, belt loaders into the holds, a fuel truck, a catering truck lifting its box to a door, a marshaller with orange wands; at the left end the de-icing pad, two trucks on booms, spraying orange after dark | **The marshaller** guides everything in with full ceremony: a plane, the fuel truck, the catering truck, a man on a bike, a goose. And **de-icing:** after dark a plane is sprayed orange, gets back in line, waits, and is sprayed again | A goose *(in a hold)*; a wedding dress; a pilot in slippers; a stowaway; a snowman in a safety vest *(after dark)* |
| **The Runway** | The runway along the water, its numbers painted big, the centerline lights; planes landing over the harbor and taking off on the clock; the windsock; the fire crew's truck; bird control's cannon; the approach light pier out over the water at the left end, with a plane spotter on it; seals; at night, the plows sweeping the runway in a line | **The plows:** after dark a line of plows sweeps the runway side by side, again and again; behind them a goose walks the same line, plowing nothing. And bird control's cannon goes BANG every few minutes: every gull for a mile lifts off, and settles again | A goose; Uncle Ray; a plane spotter; a dalmatian; a seal |

## Cast
- **The Courier** (the shared universe's): a parcel for "G. Goose, Flight 1", on the clock from the water taxi through the queue, security and the gates, and home again when Flight 1 leaves without him.
- **Inspector Pidge:** at C13 behind a newspaper, waiting for Monday's flight. A find.
- **The marching band** (the Marching Ducks, a high school band from Worcester): twelve kids in cranberry uniforms flying to the parade in New York. The tuba player has no tuba.
- **The bride**, flying to her own wedding in sweatpants and a tiny veil. Her dress is on a cart on the apron, headed for the wrong plane.
- **Grandma**, back in the check-in queue for the third time with an empty roasting pan: her turkey is on the X-ray.
- **The skier**, being wanded at security in ski boots. His skis are on the curb.
- **Ray's family**, at arrivals pick-up with a balloon and a sign, WELCOME HOME RAY. Ray is in a box that fell off a cart by the runway. He always wanted to see the runway.
- **The man at the scale**, wearing more of his clothes every hour.
- **The man in the scanner,** hands up since six.
- **The man at the bar,** same stool since eight.
- **The marshaller,** the trooper, the gate agent, the supervisor at the jam, the handler who throws FRAGILE, the de-icers, the plow drivers, the fire crew, bird control, the plane spotter on the pier.
- **The crowd:** families in matching sweatshirts, students going home with laundry, a man in an inflatable turkey costume, a sniffer dog, a raccoon. Thanksgiving's whole cast, in parkas.

## Palette and plate
A cold harbor plate, late November: slate water, tarmac and concrete, the airport's own signal colors, and Thanksgiving's cranberry. Draft inks for the art director to tune:

- Harbor `#55819A`: Boston Harbor, **and the paper** (the plate is the water, so it runs to every edge)
- Tarmac `#5B5F6E`: the runway, the apron, the roads
- Concrete `#CFC8B8`: the terminal's floors, the apron's stands, the garage
- Signal `#F2C230`: taxiway lines, the airport's signs, the band's brass
- Safety `#EE7A31`: vests, cones, wands, and the de-icing spray after dark
- Cranberry `#A8364A`: the terminal's carpet, the chapel's door, the band's uniforms
- Snow `#F3F1EA`: the snow, the jet bridges, the planes, the page's loose words

Line ink stays the game's navy (`#252D52`). The plate follows the day (`plate.at(t)`): a pale grey harbor at dawn, bright at noon, slate when the snow starts, a deep navy night after the ground stop, the terminal's windows and the runway lights lit over it. The snow builds on the ground through the evening.

## Alive
- **The day,** a six-minute loop from 4am (the clock slows for the rush and the night and hurries through the small hours):

| Loop | Hours | What's going on |
| --- | --- | --- |
| 0:00 to 0:20 | 4am to 6am | The first wave: the curb fills, the queue starts, the Courier arrives |
| 0:20 to 1:40 | 6am to 11am | **The rush:** the queue out the door, every gate boarding, planes in and out |
| 1:40 to 2:20 | 11am to 2pm | A quiet hour: lunch, the board going yellow |
| 2:20 to 3:10 | 2pm to 6pm | Snow from 3pm, **sunset** at 4:15, the storm at dusk, the ground stop at six |
| 3:10 to 4:50 | 6pm to 11:30pm | **Stuck:** everything canceled, the gates a campsite, de-icing, the plows |
| 4:50 to 5:30 | 11:30pm to 12:30am | The ground stop lifts; **Flight 1** holds short at 11:57 (the ending's moment) and goes just after midnight |
| 5:30 to 6:00 | 12:30am to 4am | The night, in thirty seconds |

- **Things that travel the map:** the Courier; bags on the belts and carts from check-in through the bag room to the planes; the minivan round the curb; planes landing over the harbor and taking off; the pink bag on its loop.
- **Machines:** belts, the sorting loop, X-ray tunnels, the board flipping, the jet bridges, belt loaders, the catering truck's box going up, de-icing booms, plows, the windsock, the Silver Line bus, the water taxi.
- **Weather:** snow from 3pm, heavy from five, easing at eleven; it settles on the apron and the runway through the evening.
- **Sound bed** (session 17's beds, chosen at the art): the terminal's hum and announcements inside, jet engines and the wind outside, the band rehearsing, the bird cannon's bang, a honk now and then from a room that still hides its goose.

## Mechanic
**Reunite: match a bag to its owner.** No other place has it. Five of the things are lost bags, and each has an owner somewhere else in the airport. Finding the bag puts its owner on the list, with the bag's tag under the label as a clue ("Tag: Marching Ducks, row 30. Big lungs."). Find the owner and they're together again; the art shows them with it from then on (the tuba plays).

- **The pairs:** the skis (the Curb) and the skier (Security); the frozen turkey (Security's X-ray) and Grandma (Check-in); the tuba (the Bag Room) and the tuba player (the Gates); the wedding dress (the Apron) and the bride (the Gates); Uncle Ray (the Runway) and Ray's family (the Curb). Every area has a half of one.
- **Bags go the long way.** Each pair crosses the map, so a reunion sends you across the airport the way the bag went, or back the way its owner came.
- **The X-ray** is Security's poke and the level's hero toy: tap a monitor and it shows the inside of the bag in its tunnel right now (a new bag every few seconds, on the clock). The turkey is on it, sometimes.
- **Built this session (decision 6):** a find can come `after` another, anywhere in the place: it isn't on the list, can't be tapped and has no hint until that one's found; then the toast says it's on the list. The second half of each pair is an ordinary find, so saves need nothing new.

## Finds
One goose and four things per area (7 geese, 28 things), five of them in pairs. Kinds per the rules (about half spot, a third poke, one or two hard, the goose never spot). Final spots at the art.

| Area | Goose | Things |
| --- | --- | --- |
| The Curb | In the back seat of a taxi, meter running *(poke: the taxi's door)* | A pair of skis *(spot; its owner is the skier)* · Uncle Ray's family *(spot, after Uncle Ray)* · A raccoon *(poke: the bin by the smokers)* · A lost glove *(hard: on a bollard, where its owner might see it)* |
| Check-in | In the queue with everyone else *(hard)* | The turkey's owner *(spot, after the turkey)* · A pair of lucky underpants *(poke: the bag on the scale)* · Someone praying for an upgrade *(spot, in the chapel)* · A lost passport *(hard)* |
| Security | In the pile of shoes *(poke)* | A frozen turkey *(poke: the X-ray monitor)* · The skier *(spot, after the skis)* · Someone with their hands up *(spot)* · A tiny bottle of hot sauce *(hard)* |
| The Gates | At the bar, between two men *(hard)* | The tuba player *(spot, after the tuba)* · The bride *(hard, after the wedding dress)* · Inspector Pidge *(poke: the newspaper at C13)* · A $19 lobster roll *(spot)* |
| The Bag Room | In the lost-and-found cage *(poke)* | A tuba *(spot, on the belt)* · A cat *(poke: a pet crate)* · A bag marked fragile *(spot, in the air)* · A set of false teeth *(hard)* |
| The Apron | In a plane's hold *(poke: the hold door)* | A wedding dress *(spot, on a cart)* · A pilot in slippers *(spot)* · A stowaway *(poke: the catering truck's box)* · A snowman in a safety vest *(hard, after dark)* |
| The Runway | Walking the centerline among the gulls *(hard)* | Uncle Ray *(hard: a box off a cart)* · A plane spotter *(spot)* · A dalmatian *(poke: the fire truck)* · A seal *(spot)* |

**Things that answer a tap** (two to four an area, one marked `teach`): the taxi, the bin and the garage's ticket machine ("Insert ticket. Weep."); the kiosk ("Please see an agent."), the bag on the scale, the chapel's door; the X-ray monitors, the bin of things that aren't coming back ("Not one of these is coming back."), the shoes; the board (it flips one more delay), the gate desk's microphone ("Final call for passenger Goose."), Pidge's newspaper; the lost-and-found cage, the jam, the pet crate; the hold doors, the catering box, a tug driver asleep ("Five more minutes."); the windsock, the fire truck, the bird cannon ("BANG. Every gull gone. Nearly.").

**Decoys,** one an area: a gull on a lamppost (the Curb), a goose-shaped neck pillow (Check-in), a "Have you seen this goose?" poster (Security), a bottle of vodka with a goose on it (the Gates' bar), a hunting decoy on the belt ("Literally a decoy.", the Bag Room), a gull on a wing flying standby (the Apron), a swan in the harbor in November, lost (the Runway).

## Shared universe
- **The goose** in every area, and on the parcel ("G. Goose, Flight 1").
- **The Courier** and his parcel (a loaf of bread, seen on the X-ray).
- **Inspector Pidge,** a find, one flight behind.
- **Gander Cola** in the food court's fridge and on the catering carts.
- **A "Have you seen this goose?" poster** at security.
- **Boston:** the donut chain's lookalike at the gates (as in Moving Day), Castle Island and the Seaport across the water, and Moving Day's plane landing at Logan is one of these.

## Tone
Holiday travel chaos, affectionate. Everyone's stressed and everyone's going home. The jokes are about queues, rules, luggage and weather, and about people being ridiculous under pressure, never about anyone being hurt. Uncle Ray is the darkest joke and stays warm: he's going home for one last Thanksgiving, his family is waiting with a balloon, and the reunion is the sweetest one. No security theater politics, no real airline's name or logo, no crashes, no near misses. The goose on the runway is the one safety joke, and the tower handles it.

## Real places, checked
Checked October 18, 2026 against Wikipedia's Logan article, the FAA and trade press on the runway pier, and Massport's terminal pages through search. Businesses and airlines are lookalikes with made-up names; the airport, its terminal, the chapel and the landmarks use their real names (LEVELS.md, "Real places").

| Place | What's real | How we show it |
| --- | --- | --- |
| **The terminals** | Four, A, B, C and E, round a central garage, joined by walkways and the Silver Line's SL1 | One terminal, **Terminal C** (decision 4), with the garage behind it and the Silver Line at the curb |
| **The control tower** | A central landmark, about a dozen stories: two segmented elliptical pylons with a platform between them | The hero, by the garage at the back |
| **Our Lady of the Airways** | A chapel in Terminal C, opened in 1951, the first airport chapel in the United States | Off the check-in hall, someone praying for an upgrade |
| **Runway 15R/33L and its pier** | The longest runway; its 33L end was extended over the harbor on a pier, with the approach lights and a bed of crushable concrete to stop a plane | The one runway, along the front, its end on a pier over the water at the front left |
| **The water taxi** | The water shuttle dock on Harborside Drive, on the inner harbor | At the back left, on the water |
| **The skyline** | Downtown is across the inner harbor to the west, the Seaport and South Boston to the southwest, the Zakim to the northwest | The backdrop, in that order, left to right |
| **To check before the art** | Logan's gate numbers in Terminal C (we use C12 to C14), and whether its plows really sweep in a line (most big airports do) | |

## Engine and kit needs
- [x] **Finds that come after another** (`after: 'zone:find'` on `R.find`): off the list, untappable and unhinted until the first is found, then a toast puts it on the list. QA taps the first before the second; smoke checks a pair. *(Session 20.)*
- [x] **A find's art reads whether it's found** (`R.found('zone:find')`, any map): so a reunited owner is drawn with their bag (the tuba plays) and the bag goes home. The world holds a lookup the game fills in when it loads the map (`world.found`); until then nothing's found. Smoke checks it. *(Session 21.)*
- [x] **Toy-scale planes** in the level's kit (`kit.js`, `plane`, `drawPlane`): 13 long and 13 across, a round body in pieces that sort with the people round it, three lookalike liveries. *(Session 21.)*
- [x] **The X-ray monitor:** a poke drawn with whatever bag is in its tunnel now, as an X-ray picture. *(Session 21, Security.)*
- [x] **Snow:** flakes blowing in from 3pm, outdoors only (never over the terminal or the bag room); the ground whitening as it settles (`snowCover`, a still layer laid on in twelve steps, so it bakes into each area's cached floor). *(Session 21.)*
- [x] **The day's plate** (`plate.at(t)`, style.js `paperAt`): a grey dawn, a bright cold morning, slate with the snow, pink at sunset, navy all night. *(Session 21.)*

## The greybox (session 20, gate 2)
At `#/logan` (hidden from the picker until it ships). `npm run qa -- logan`: 15 passed, 0 failed; the warnings are small finds on a phone (the art sizes them), Pidge behind his newspaper and the FRAGILE bag flying past its thrower (both on purpose). Slowest view 9 to 39 ms a frame at 4x slowdown across two cloud runs (the Block's is about 30), with everything as plain blocks; `node tools/fps.mjs logan` on the owner's Mac comes after the art.

**What's there now:**
- **The layout** as the plan under Shape has it, 104 x 60, one big map (`open: true`, nothing cut away): the Curb along the back (the water taxi dock on the harbor at the left end, the garage and the tower in the middle, the taxi queue, the Silver Line and arrivals at the right), Check-in, Security and the Gates in the terminal with its roof off and its walls low, the Bag Room and the Apron (the de-icing pad, C13's and C14's planes, Flight 1 at C12), the Runway along the front with its light pier out over the water. All in `plan.js`; every area works in its units.
- **Every find pinned** (numbered; 28 things and 7 geese), with its kind, hint and riddle. Every poke and decoy answers back (22 pokes, 7 decoys, one `teach` an area). The five pairs are wired with `after`; the list starts at 30 and the owners join it as their bags are found.
- **The X-rays** show what's in their tunnels (a new bag every four seconds; the turkey is in the first one's).
- **The clock** (`clock.js`) as the Alive table has it: the board's delays growing by the hour and canceling at six, the man at the scale adding a layer an hour, the trays stacking up, snow from three, the snowman after dark, planes landing and taking off from 5am to the ground stop, the plows sweeping the runway in the stuck night.
- **On the clock across areas** (`day.js`): the Courier's day (the water taxi, the queue, security, C12, home again); a bag train from the bag room to C14 and C13 and back, four trips a loop; Flight 1 parked at C12 all day, pushing back at 11:30pm, holding short at the runway's end at 11:57 and taking off over the pier.
- **The ending:** the clock jumps to Flight 1 holding short, and the camera goes to the runway's end.
- **Backdrop:** the skyline across the water in plain blocks (the Seaport and Castle Island, downtown, the North End, the Zakim). The snow falls over everything from 3pm.
- **Sound:** the terminal's chatter and hum inside, the roads and the harbor outside, a jet every half minute by day, the gate's chime, gulls.
- **Kit, for the art:** `plane()` and `drawPlane()` (toy planes in pieces), `run()` (a long block in short pieces, so people beside it aren't painted over: counters, walls, seat rows, belts), `line()` and `water()`, in `style.js`.

**At gate 2** (the lead's calls, decisions 15 to 23; any can be overturned at the preview).

**Left for the art:** everything drawn for real: the terminal's glass and roofline, the tower, toy planes, the people (10 to 18 an area), the night and the day's plate, the snow settling, the X-ray's pictures, the board's flights, the skyline, the finale (the geese crossing in a line in front of Flight 1), a reunited owner drawn with their bag (needs the engine piece above), and the sound bed tuned.

## The art (session 21)
Built by the lead's kit first, then nine artists in their own worktrees at once (the seven areas, the cast on the clock with the ending, and everything around the airport with its sound), then one art director, then four reviewers touring every area pinched in at six moments of the day. All of it in `src/maps/logan/`.

**The kit** (`kit.js`, the lead's, then the art director's): toy planes as smooth solids (a round body in short pieces, swept wings, engines, a fin with the airline's name), in pieces that sort with the people round them and stay whole across the 16-unit seams (`seamSafe`), printed again at night with their windows lit; three lookalike airlines (style.js `LIVERY`: Spite, JetBlew, Northeast); tugs, bag carts and trains; luggage of every kind; people in parkas with beanies of their own colors (`hatColor`, a new option on people), and the crews (hi-vis, ear defenders, wands); the airport's black-and-yellow signs, boards and lettering; one herring gull; the terminal's low wall and glass; sleepers lying along the floor with their eyes shut; the turkey man; the night's veil and the snow lying, both baked into the cached floor in steps.

**The places and what plays out:**
- **The Curb:** the control tower (two segmented pylons, a glazed bridge, a lit cab, a beacon, 15 high), the garage, a road bowing round them between two tunnel mouths, the taxi stand (the goose's beak in the second cab's back window; the first has a lady in a fur hat: "This one's taken."), the hatchback family's eleven bags (the skis, red with a white stripe), the smokers' bin with a raccoon's tail, the Silver Line, the KISS & FLY couple, the water taxi's dock, Ray's family with their balloon. **The minivan** does eight laps, waved on by the trooper, the kid in the back sadder every lap.
- **Check-in:** the queue that grows out the door and lies down after the storm (the goose in it with its own little case, the turkey man behind it in the morning), Grandma and her empty roasting pan, **the man at the scale** a layer an hour until he's a striped ball in a snorkel, the kiosks, the oversize drop, Our Lady of the Airways.
- **Security:** the X-rays (each screen shows what's in its tunnel now: the Courier's bread, the turkey), **the man in the scanner** with his hands up all day (coffee at two, a blanket at seven, asleep on his feet at eleven), the skier wanded in his boots, the goose in a heap of shoes with a foot out, snow globes confiscated by the hour while the real snow falls outside, a beagle, the checkpoint asleep at night.
- **The Gates:** **the board** (Flight 1 ON TIME, everything else later by the hour and CANCELED at six), **the band** short one tuba (playing once its player's found), Pidge behind THE DAILY HONK, the goose on a bar stool in a little beanie, the bride asleep on her case, the charging pole, and from 7:30pm the whole concourse camped out (the band asleep on their cases, a tent at C14, Friendsgiving).
- **The Bag Room:** the belts through the flaps, the jam and its mallet, **the pink bag** on its endless lap (a party hat from six, ONE MORE LAP at midnight), FRAGILE thrown the hardest, the lost and found since 1987 with the goose behind KEEP SHUT, a cat, a dog, a parrot.
- **The Apron:** the planes at their jet bridges (C12 Spite, C13 JetBlew, C14 Northeast), the goose in C14's hold with its tail caught under the door, the stowaway in the catering box, the pilot in bunny slippers, the dress on a cart bound for Honolulu, **the marshaller** waving in whatever comes, a fourth plane waiting on the de-icing pad all day for a gate and **de-iced orange** three times in the stuck night, the snowman in a safety vest.
- **The Runway:** planes landing over the pier and taking off back over it in turn, **the plows** WAITING FOR SNOW / SINCE OCTOBER at the pier end, then sweeping in echelon all night; bird control's BANG (the gulls lift off the runway and the sky together), the spotter on his ladder, seals, Ray's box with a gull for company, the fire truck and its dalmatian.
- **On the clock across areas** (`day.js`): the Courier's whole day (the water taxi at five, the queue, his bread through the X-ray, C12 on a folding stool from 11:27, asleep from nine, at C12's window holding up the parcel as Flight 1 leaves: "Tomorrow, then."); a family running late from the curb to C14; an airport cart up and down the concourse; the bag train; **the turkey man**, one man through the day (the first bus, the check-in queue, security, the gates, asleep under his feathers); Flight 1 pushed back, towed out and lined up.
- **The ending** (`finale.js`): seven geese march along the grass and cross the runway in front of Flight 1, hop into the harbor and paddle out; the tower clears it, it rolls and lifts off over the pier. The camera frames the runway's end close (`span`), and the card comes when it's rolling (decision 31).
- **Around** (`ambient.js`): Boston across the inner harbor in its real order (Castle Island's fort, Conley's cranes, the Seaport, downtown with the Custom House clock showing the game's time, Rowes Wharf, the North End with the Old North Church's two lanterns at night, Charlestown with Old Ironsides and Bunker Hill, the Zakim lit blue), printed in the harbor's far inks and cached as one picture; water taxis, a salt barge, a tanker, a lobster boat, a sailboat; the snow blowing in off the sea, far planes, gulls.
- **Sound** (`sound.js`): beds by area through the day (the crowd's level, the storm's wind, the bag room's belts, the band, the TV at the bar, the de-icers), 119 cues (jets when the runway flies them, the chime, the BANG, horns, the plows' beeps, a cheer when the stop lifts, the chapel's organ at six), every one under a honk.

**Checks** (in the cloud): `npm run qa -- logan` passes (16 passed, 0 failed, 33 things that answer a tap, 8 decoys; warnings: three hard finds small on a phone, on purpose, and the dalmatian off its area's framing while the fire truck clears the runway for Flight 1); the smoke test passes, with a check that the art knows when an owner's found. Speed in the cloud: every view within budget, the slowest the whole place at 27 ms at 4x against the 60 budget on a quiet machine (41 to 50 while artists were screenshotting). Real frames a second wait for the owner's Mac.

## Speed on the owner's laptop (October 20)

The owner played it on the 2017 MacBook Pro (Intel HD 630) and found it laggy. A sibling change fixed the sharpness step-down (it settles at 1.25x and about 40 frames a second); this one makes the airport cheaper to draw, so it holds a sharper picture. Nothing looks different at normal viewing.

What a frame cost, measured: Chrome's graphics process was busy 98% of the time replaying the canvas's drawing calls (about 4,000 shapes and pictures a frame in Security), not the page's own code. What changed:
- **The snow** went on as four huge strokes the graphics chip worked over the whole screen four times; each flake is now a stamp of one small picture per kind (`ambient.js`, `flake`). Night in Security at 2x: 10 to 15 frames a second.
- **The far shore** (Boston's skyline, a picture four times the screen) was painted again every five seconds by day for windows that aren't lit, and at the full margin each time the harbor's tone stepped (twice a second at dawn and dusk). It now re-rolls windows only after dark, and a tone step repaints only the view and a slim margin.
- **Glows inside still things** (a parked plane's wingtip lights at night, a taxi's tail lights) kept the whole thing out of the cache, drawn shape by shape every frame. The engine now sets a still thing's glows aside when it caches it and lays them on live over its stamp (`zone.js`, `measureStills`; `art.js`, `Q.glows`). Every still thing in Departures caches now.
- **Rigid things** (`art.js`, `rigid`): something that slides without changing is drawn once into a picture of its own and stamped as it goes, landing on whole pixels: the bag train's tug and carts, the airport cart's chassis and roof, the Silver Line bus on its straights (the snow on its roof stays live), the trucks on the apron, every bag (`kit.js`, `bag`), the X-ray's trays and riders, the shoe pile shut or open, standing gulls (one picture per way they can look), the parked plows while their beacons are off, and the landing and departing planes, piece by piece. A few new pictures a frame at most, and only while the camera's still.
- **Floor pictures** of a big area's chunks go on in bands as wide as the floor across them, not as their whole box (the box is about half empty, a sliver along an area's edge nearly all empty).
- **The clock's hour** keeps its last answer (thousands of asks a frame).

`node tools/fps.mjs logan`, frames a second, before and after (1440 x 800; each view is measured at its own moment of the morning, Security near 5am to the Runway near 8, so dawn's costs show):

| | 1.5x before | 1.5x after | 2x before | 2x after |
|---|---|---|---|---|
| The whole place | 39 | 42 | 40 | 38 |
| Security | 20 | 23 | 8 | 13 |
| Check-in | 16 | 19 | 10 | 13 |
| The Gates | 23 | 24 | 15 | 16 |
| The Curb | 40 | 38 | 25 | 27 |
| The Bag Room | 20 | 22 | 16 | 17 |
| The Apron | 26 | 29 | 21 | 27 |
| The Runway | 27 | 33 | 22 | 27 |

A view moves a frame or two a second between runs; runs while other apps worked the laptop (Draw Things, a busy Chrome) came out far lower and aren't counted. At set moments in Security at 2x (`--eval` to set the clock): night (9pm, snowing) 10 to 15, dawn 13.5 to 15, noon 21 to 22.

**What's left, and why:** the rest is people. Each one is about 25 shapes, there are 100 to 150 on screen in the terminal's views, and almost all of them move every frame (walking, typing, the band marking time). Things that were tried and taken back: caching a moving thing while its drawing stays the same frame to frame (a quarter of the live shapes qualify, but taking every one's fingerprint cost the page more than the graphics process saved: 2 frames a second worse at 1.5x), and culling things off the screen's edge (the graphics process already skips them cheaply). Bigger wins would change how it looks or moves, so they're the owner's call: drawing the people in areas off the middle of the screen at half rate, or leaving the halftone dots off people while they move.

## For the owner at the preview
None blocking; each had the lead's recommendation, and the owner shipped it as it is, so all three stand (Decisions 24 to 34).
- **The airline names:** Spite (yellow all over, Flight 1 to Orlando, on time and never boarding), JetBlew, Northeast. Lookalikes, as the brief's rules ask. *Recommendation: keep them.*
- **The chapel's organ at six,** when everything's canceled: a few spooky bars. *Recommendation: keep it; it's one line in sound.js if it's too much.*
- **The card after the ending** comes at 18 seconds, with Flight 1 rolling and the geese out in the harbor (the cast's artist suggested 26, after liftoff). *Recommendation: 18; the liftoff plays on beside the card.*

## Decisions

Gate 1 (the brief), the lead's calls, session 20:

1. **Departures, not a zoo.** The owner picked "Departures, or one of our zoo ideas". Both zoo pitches (the Great Escape, the Crossing) need the animals engine (E6) first, and the Great Escape's terraced hill needs ground steeper than the engine draws; Departures runs on today's engine and its verb is new. The zoo is the next place if the owner wants it, after E6.
2. **It's Logan.** The owner wants real places people recognize, and LEVELS.md suggested Logan to sit with the Boston places. Named, as a public place; airlines and shops are lookalikes.
3. **One big map from the start** (`open: true`, ROADMAP 19's direction): the curb to the runway in view and alive at once, one list.
4. **One terminal, Terminal C,** standing in for four, and one runway for six (compressed, never rearranged: the terminal faces downtown across the inner harbor, the runway ends on the water).
5. **The day before Thanksgiving, with a nor'easter at dusk.** The busiest travel day of the year gives the crowd and the luggage a reason; the storm gives the clock its turn (the ground stop) and a night. The snow stays light next to Beacon and Arlington's blizzard, if that place is ever built.
6. **The verb is reunite** (LEVELS.md's "match"): five lost bags, each with an owner elsewhere. Built as `after` on a find, not a new format: a pair is two ordinary finds, so the goal stays every goose and most things, the list stays one list, and saves need nothing new. A new format (like the trail) would have meant a log, a screen and a save change for five pairs.
7. **A bag and its owner are never in the same area,** and every area has a half of one pair, so reunions cross the map.
8. **The owner half's clue is the bag's tag,** as its riddle under the label, so it reads as part of the find, not a hint.
9. **The X-ray shows the bag in the tunnel now,** on the clock, rather than one you choose: it's a poke you return to, and a find on it (the turkey) is a poke find.
10. **Toy-scale planes,** about 16 units long and wide instead of a real 50: three fit at the gates and the people still read. A picture book's planes.
11. **The tower stands at the back,** by the garage (where Logan's is, in the middle of the terminals), so the hero is tall without hiding anything; the planes are the only tall things in front, and no find sits behind a tail.
12. **The ending is Flight 1:** the clock jumps to 11:57pm, Flight 1 holding short, the geese cross the runway in front of it and it waits. The on-time flight that never boarded is the day's last joke.
13. **Uncle Ray stays,** warm: the darkest joke and the sweetest reunion.
14. **Departures** in the picker, with **"Boston Logan"** as the subtitle, and the id `logan` (it's in links and saves).

Gate 2 (the greybox), the lead's calls, session 20:

15. **104 x 60,** a little smaller than Plum Island: the apron and the runway are the big areas, and the terminal's three are about a Block Party room and a half each.
16. **The terminal's walls are low** (waist height, as blocks), its roof off: the curb-side wall with its doors and the airside glass with the jet bridges. Nothing tall stands in front of a find.
17. **The harbor bites the corners:** the water taxi dock at the back left and the light pier at the front left are on water inside their areas, printed in the harbor's ink, so the slab of filled land reads.
18. **On an upright phone** the overview frames the terminal (Check-in to the Gates) at full height and the airport runs off both sides; on its side and on a big screen, the whole airport.
19. **One harbor all day** in the greybox; the day's plate is for the art.
20. **The first visit is invited to Security** (the X-ray is the hero toy, in the middle of the map).
21. **Three gates, not four:** C12 (Flight 1), C13 (the band, and Pidge) and C14 (the bride). Four planes didn't fit the apron at toy scale with room for the people.
22. **Flight 1 is the night's only plane.** Regular traffic runs 5am to the ground stop; after it, only Flight 1 goes, so nothing else is on the runway at the ending.
23. **The Courier misses Flight 1.** He waits at C12 all day and watches it leave from the window, then takes the water taxi home. It keeps his walk inside the loop, and it's funnier than boarding.

Session 21 (the art), the lead's calls:

24. **Three lookalike airlines:** Spite (yellow all over: Flight 1 to Orlando), JetBlew (the band's flight to New York at C13) and Northeast (C14, the bride's, to Philadelphia). Traffic on the runway takes them in turn.
25. **The night is printed, not dimmed** (Plum Island's answer): outside, the ground takes a veil of night ink and the big things print again in dusk inks; the terminal and the bag room stay lit in their day inks, so the hall glows against the snowy dark. People keep their day inks, so every find reads.
26. **The harbor is the paper and follows the day;** the areas leave their water unpainted, so it always matches.
27. **It only snows outside:** no flakes over the terminal or the bag room (its roof is off for us, not for them). Snow lies from 3:30pm and is gone by the next morning.
28. **The turkey man is one man,** travelling with the day (the art director: four artists had each drawn him).
29. **A fourth plane waits on the de-icing pad all day** "for a gate" (the art director), filling the apron's biggest empty patch and leading into the night's spraying.
30. **The Courier waits at C12 all day and watches Flight 1 go from the window,** holding up the parcel ("Tomorrow, then."), then takes the water taxi home.
31. **The ending is framed close** (the runway's end, `span: 8.5`) and the card waits 18 seconds, until Flight 1 is rolling.
32. **The first visit's ring sits on X-ray lane A's screen,** where the card says to tap (it was in the walkway beside it).
33. **The Curb's road bows round the tower and the garage** between two tunnel mouths, rather than running through them (the greybox put them on the road).

Gate 3 (the preview), the owner, October 20:

34. **Shipped without the blind playtest.** The owner played it on the 2017 MacBook Pro, and once the sharpness step-down was fixed (it now steps after two seconds of slow frames, and sees frames as slow as one a second) and the airport was made lighter to draw (PR #51), opened it. The three questions above stand as recommended.
