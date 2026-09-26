# Roadmap

Where Squares is going, and the order to build it in. Each session below is one pull request that ships something playable. Update this file at the end of every session: tick what shipped, move what didn't, and record decisions.

Inspiration notes and what each reference teaches: [INSPIRATION.md](INSPIRATION.md).

## The bar

The goal is a game good enough for an Awwwards Site of the Day. Awwwards scores Design (40%), Usability (30%), Creativity (20%) and Content (10%). For Squares that means:

- **Design:** every place looks like a different printed plate from the same studio. Recognizable from its silhouette alone.
- **Usability:** a first-time visitor on a phone finds their first goose inside 60 seconds, without reading anything.
- **Creativity:** each place has one mechanic that only makes sense there (the tide, a lantern, steam).
- **Content:** every corner has a joke. Places reference each other.

## Where we are (after PR #4)

- Engine: places made of zones; camera, renderer with cutaways (front, above), snapshots for speed, input.
- Game: find the goose and three things per zone, hints, tallies, saves (v2), sound, completion.
- Screens: title with a drifting map, place picker, completion card.
- Places: **The Block** (16 rooms on a plate) and **The Walk-Up** (4 stacked floors).
- Problem: both places are square dollhouse rooms. The Walk-Up reads as the Block turned on its side.

## Every place needs

From the inspiration so far (see INSPIRATION.md for why):

1. A silhouette you'd recognize from the outline alone
2. A hero landmark
3. Connections between areas (bridges, stairs, lifts, paths) that people actually use
4. Its own plate (palette and print feel)
5. Its own cast
6. A running story in every area
7. One mechanic that belongs only to it

Places on the list (provisional until all the inspiration is in):

| Place | Silhouette | Hero | Plate | Cast | Mechanic |
| --- | --- | --- | --- | --- | --- |
| The Block | Square plate of 16 rooms | (none yet) | Six-ink riso | People | None yet. Candidate: lights out at night, windows glow |
| The Island | Ring of land around a lagoon, sea all round | Waterfall from a clifftop pool | Bright riso, turquoise-heavy | Beachgoers, boats, sea creatures | **The tide** goes in and out; some things only show at low tide |
| The Chasm | Tall and narrow, surface to deep | The chasm, things falling through it | **One ink**, gray washes | People, goblins, things in the rock | **A lantern**: the deeper you go the darker it gets; you see what your light touches |
| The Bathhouse | A floating diorama, edges fading into paper | A giant wooden tub | Soft watercolor riso | Rats | **Steam**: wipe it away to see what's behind |
| The Corner | A tight street-and-park crop | (the chaos) | Thick-line flat color | Big New Yorkers, pigeons | **Traffic lights**: things only happen on red |
| The Rock | Tall island, sea to sky | A cable lift and a windmill | Full color | Dragons, sea serpents, a flying whale | **Ride the lift** between levels |
| The Walk-Up | Stacked floors | (none) | Six-ink riso | People | To decide (see Decisions) |

## Engine work

What the places above need that the engine can't do yet. Roughly in dependency order.

- **E1. Terrain and water.** Ground with height: tiles of sand, grass, rock and water with cliff faces, stairs and ramps, and an organic coastline instead of a square slab. A water surface with moving foam at the shore. Drawn in the same halftone style. *Needed by the Island, Chasm, Rock, Bathhouse.*
- **E2. Areas, not boxes.** Today a zone is three things at once: what gets drawn, what the camera frames, and whose finds are listed. Split them. **Chunks** are what gets drawn and cached (invisible seams). **Areas** are what players visit (framing, name, story, finds), and can be any shape. People and things can cross from one chunk to the next, sorted correctly. *Needed by every continuous place.*
- **E3. Plates.** Each place picks its own inks (swap the palette `C`), its paper color, line weight, and edge style: hard plate (the Block), soft vignette into paper (the Bathhouse), single-ink wash (the Chasm).
- **E4. Casts and scale.** `folk()` grows a species option (rat, goblin, sea creature) and each place sets a character scale (the Corner's people are about twice our size).
- **E5. Camera shapes.** Tall places built for scrolling on phones. A camera that can ride a path (the lift). Framing for areas of any shape.
- **E6. Mechanic hooks.** A place can add a `mechanic` module: it runs every frame, can draw over the scene, can decide whether a find is visible right now (tide, lantern, steam), and can take input (wiping steam).
- **E7. Crowds and performance.** The Island's beach has hundreds of people. Bake the still ones into the chunk picture and animate a moving few; draw less detail when far away. Hold 60 fps on a mid-range Android phone.
- **E8. Small fixes found while drawing the Walk-Up.** `route()` ignores a pause on the last waypoint of a there-and-back route (fixing it shifts timing in some Block rooms, so check them). `paintText` only paints on the two back walls. The goose can't wear hats or carry things.

## Game work

- **G1. Progression.** Turn on unlocking places by total geese (`lockMaps` already exists). Per-place medals: all geese, all things, no hints.
- **G2. Modes.** Explore (today). **Daily goose**: one goose hidden somewhere new each day, the same for everyone, shareable result. **Challenge**: a short list of things to find against a clock.
- **G3. Onboarding.** First visit: the game shows you one goose, you tap it, you're playing. No text walls.
- **G4. Accessibility.** Find list usable by keyboard and screen reader, a "describe this room" story for each area, reduced motion honored everywhere.

## Polish (the Awwwards layer)

- **P1. Transitions.** The picker card zooms into its place. The title letters hand off to the place name. Every change of screen is one continuous motion.
- **P2. Sound.** A quiet ambient bed per place (waves and gulls, a dripping cave, a bathhouse), a mix that ducks under the honk, sound off by default until the first tap.
- **P3. First load.** Title visible in under a second on 4G; places load while you're on the picker; a share image per place (made with `tools/shoot.mjs`).
- **P4. Offline and install.** Play without a connection once loaded; add to home screen.
- **P5. The case study.** A making-of page for ryankm.com and the Awwwards submission: process, greyboxes, the engine, credits.

## How a new place gets made

1. **Brief.** One page: the seven things above, the areas, the running gags, the finds. The owner approves it.
2. **Greybox.** The place built from plain shapes (terrain, hero, paths), no detail. Screenshot on desktop and phone. The owner approves the silhouette and composition. This is the cheapest moment to change your mind.
3. **Areas.** Parallel agents draw one area each from the brief and `tools/ROOM_BRIEF.md`, cross-referencing each other's gags.
4. **Art direction pass.** One agent (or a session) goes over the whole place for consistency: palette, scale, density, how the gags connect.
5. **Playtest the finds.** Every find should take somewhere between 20 and 90 seconds. Too easy or impossible gets moved.
6. **Ship.** Share image, picker card, smoke test updated.

## Sessions

Each is one PR. Order can change; dependencies can't.

- [x] **Session 1: Game foundation.** Places and zones, title, picker, completion, saves, Vite, smoke test. *(PR #4)*
- [ ] **Session 2: Terrain and areas (E1, E2).** The engine grows terrain, water, organic coastlines and areas separate from chunks. Proven with a small hidden test cove (not in the picker). *Done when: a cove with a beach, a cliff, stairs, water and a bridge draws in our style, holds 60 fps on a phone, and a person can walk across a chunk seam without popping.*
- [ ] **Session 3: The Island.** Brief, greybox, then art for the first hero place, plus the mechanic hooks (E6) and the tide. *Done when: it's the best-looking place in the game and the tide changes what you can find.*
- [ ] **Session 4: Plates, casts, tall places (E3, E4, E5) and The Chasm.** One-ink plate, a goblin cast, a scrolling vertical place, the lantern.
- [ ] **Session 5: The game loop (G1 to G3).** Unlocks, medals, the daily goose, onboarding.
- [ ] **Session 6: The Bathhouse.** Soft-edged diorama, rat cast, steam.
- [ ] **Session 7: Polish (P1 to P4) and performance (E7).** The Awwwards pass.
- [ ] **Session 8: The case study and submission (P5).**
- Later: The Corner, The Rock, the Walk-Up decision, small fixes (E8) whenever a session touches that code.

## Decisions

Open, for the owner:

- **The Walk-Up:** keep it as a small bonus place, rework it into something distinct (for example the building's cross-section becomes part of the Chasm's surface town), or retire it from the picker?
- **Casts beyond people:** are rats, goblins and sea monsters in bounds for the brand, or should every place stay human?
- **One-ink plates:** does a single-ink place (the Chasm) fit the "six inks" identity? (A real riso print with one drum is authentic.)
- **How relaxing vs. how game-y:** is Squares a calm picture book (no timers), or does it want challenge modes and scores? This decides G2.
- **Sound:** synthesized (tiny, fits the code-drawn idea) or recorded ambience (richer)?

Made:

- **Diversity over formula.** Every place is a different shape (tall, wide, one big continuous map, a diorama), its own color palette (never one ink), and its own story to investigate. Giants, trains and the like only where the theme calls for them. The main goal is that every place feels alive. *(after inspiration review)*
- **Tone:** adult humor and darkness are welcome (dark comedy, not gore for its own sake). *(after inspiration review)*
- **Levels get added often.** The level backlog lives in [LEVELS.md](LEVELS.md). Making a new level should get cheaper over time: that's an engine priority, not just an art one. *(after inspiration review)*
- **A shared universe:** recurring characters and brands across places, beyond the goose. *(after inspiration review)*

- Unlocking places is built but off (`lockMaps: false`) until there are enough places to pace. *(Session 1)*
- Reference images are not stored in the repo; notes and credits live in INSPIRATION.md. *(Session 1 follow-up)*
