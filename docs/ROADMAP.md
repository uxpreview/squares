# Roadmap

Where Squares is going, and the order to build it in. Each session is one pull request that ships something. Update this file at the end of every session: tick what shipped, move what didn't, and record decisions.

- How a level gets made, start to finish: [PROCESS.md](PROCESS.md)
- The level backlog: [LEVELS.md](LEVELS.md)
- Level briefs: [levels/](levels/)
- Reference images and what they teach: [INSPIRATION.md](INSPIRATION.md)

## The bar

The goal is a game good enough for an Awwwards Site of the Day. Awwwards scores Design (40%), Usability (30%), Creativity (20%) and Content (10%). For Squares that means:

- **Design:** every place looks like a different printed plate from the same studio, recognizable from its thumbnail alone.
- **Usability:** a first-time visitor on a phone finds their first goose inside 60 seconds, without reading anything.
- **Creativity:** every place is a new story to investigate, and the best have a mechanic that only makes sense there (lightning that shows the past).
- **Content:** every corner has a joke. Places reference each other.

And for a game that adds levels often: **each level should be cheaper to make than the last**, at the same quality.

## Where we are

- **Engine:** places made of zones; camera (with soft edges), renderer with cutaways (front, above), snapshots for speed (and in the room you're in, still furniture drawn once and stamped), input. Houses: storeys with tags on the house to change floors, walls that drop to waist height, people walking room to room on one clock. Night: a place's own paper, lights that glow, rooms that go dark, lightning and rain.
- **Game:** find the goose and hidden things per zone, hints, tallies, saves (v2), sound, completion. A scene clock tools can set, so any moment of a loop can be shown and tested.
- **Screens:** title with a drifting map, place picker, completion card, a lift for houses (every floor, yours lit), an invitation on a place's first visit (a card pinned to a room), geese honking from rooms on the overview, a back button that goes up one level.
- **Places:** The Block, and Gooseworth Manor (a whodunit at night, three floors). The Walk-Up is retired from the picker (too close to the Block) but kept as the test bed for stacked floors.
- **Process:** the pipeline ([PROCESS.md](PROCESS.md)) and its tools: `npm run new-level`, the greybox kit, style sheets, `npm run qa` with a contact sheet, a scored blind playtest, and prompts for the area artists, the art director and the playtester ([prompts/](prompts/)).
- **Formats:** a place can be a whodunit (evidence and curiosities, a case file, accusations, a reveal). Saves are v3.
- **Next level:** the owner's list, below under Decisions: the Block as one connected place, then a beach, then the zoo.

## Engine work

What upcoming levels need that the engine can't do yet. The level that first needs each piece builds it.

- [x] **E0. Pipeline tools.** Scaffold a new level in one step; a style sheet per level; a QA command (errors, performance, finds on screen and tappable, label and copy rules, contact sheet); prompt templates for area artists, the art director and the playtester. *Session 2.*
- [x] **E1. Night and weather.** A palette per place, lights that glow (windows, lamps, candles), lightning, rain. *Session 2.*
- [x] **E2. Houses.** Inside walls cut low in the overview and full height inside a room; one storey at a time, changed from tags on the house; people passing between rooms through doors on a shared timeline. *Session 2. Next used by the Catminium and the cruise ship.*
- [x] **E3. Level formats.** Finds in groups (evidence, curiosities); a place's goal can be something other than "every goose" (solve the case); an accusation screen and a reveal. *Session 3: `game/case.js`, `ui/casefile.js`, a map's `case`. Reused by later mysteries.*
- **E4. Terrain and water.** Ground with height, cliffs, stairs, coastlines, water with moving shorelines, instead of square slabs. *La Dolce Riviera, Split, Boston, the siege, the zoo, Egypt.*
- **E5. Areas, not boxes.** Split what gets drawn (chunks with invisible seams) from what players visit (areas of any shape), so one continuous map can be as big as it likes and people can walk across it. *Every big outdoor level.*
- **E6. Casts and scale.** Animals and other species alongside people; a character scale per place. *The Catminium, the zoo, Egypt.*
- **E7. Camera shapes.** Tall and wide places that scroll; framing for areas of any shape.
- **E8. Mechanic hooks.** A place can add its own rules: run every frame, draw over the scene, decide whether a find is visible right now, take input.
- **E9. Crowds and performance.** Hundreds of people at 60 fps on a mid-range phone: bake the still ones, animate a few, less detail far away.
- **E10. Small fixes.** `route()` ignores a pause on the last waypoint of a there-and-back route (fixing it shifts timing in some Block rooms). `paintText` only paints on the two back walls. The goose can't wear hats or carry things. People on a map's clock are only drawn inside an area (someone walking up a drive beyond the last area would vanish). A find can only belong to one area, so the goose can't roam the house (the Manor wants that; E3). QA can't tell whether a find is hidden behind something: the contact sheet rings every find for eyes. Fix whenever a session touches that code.

## Game work

- **G1. The campaign.** You're tracking the goose around the world: each place ends with a clue to where it went next, which opens the next place. Uses the unlock switch that already exists.
- **G2. Progression.** Medals per place: all geese, all things, no hints.
- **G3. Modes.** Explore (today), and later an optional daily goose to find. No timers or scores on the main places (see Decisions).
- **G4. Onboarding.** First visit: the game shows you one goose, you tap it, you're playing. No text walls.
- **G5. Accessibility.** Find list usable by keyboard and screen reader, a "describe this room" text for each area, reduced motion everywhere.

## Polish (the Awwwards layer)

- **P1. Transitions.** The picker card zooms into its place; every change of screen is one continuous motion.
- **P2. Sound.** A sound bed per place (rain and thunder, waves and gulls), mixed under the honk.
- **P3. First load.** Title visible in under a second on 4G; places load while you're on the picker; a share image per place.
- **P4. Offline and install.** Play without a connection once loaded; add to home screen.
- **P5. The case study.** A making-of page for ryankm.com and the Awwwards submission.

## Sessions

Each is one PR. Order can change; dependencies can't.

- [x] **1. Game foundation.** Places and zones, title, picker, completion, saves, Vite, smoke test. *(PR #4)*
- [x] **Planning.** Inspiration, level backlog, process, roadmap, the Manor brief; the Walk-Up retired from the picker. *(PR #5)*
- [x] **2. Pipeline and the Manor's engine (E0, E1, E2), and the Manor greybox.** The level tools, night lighting and weather, houses (walls down, storeys, door handoffs). Ends with the Manor greyboxed for the owner's gate 2. *Done: `npm run qa -- manor` passes and makes a contact sheet; the greybox shows the whole house at night, every room blocked out, nine people walking the evening.* *(PR #6)*
- [x] **3. The Manor.** The whodunit format (E3), area art by parallel agents, art direction, QA and a blind playtest, preview for gate 3, ship. *Done when: a fresh player can solve the case, every find is fair, and it passes QA.* **Built and at gate 3 (PR #7):** E3, all eleven rooms and the exterior, the art direction pass, QA clean, the blind playtest. The owner's first review is in (manor.md, decisions 22 to 26: a mystery card that gives nothing away, no giveaway captions, the night to every edge, soft edges, a calm start, phone framing). **The difficulty pass is done (PR #8):** every piece of evidence hidden among look-alikes (manor.md 28), blind-playtested, and the cream strips behind Safari's bars traced and fixed (29). **Floors and the first screen are redone, and it ships to the picker (PR #9, below):** the owner asked to add it to the selection screen after seeing the lift and the invitation on an iPhone.
- [x] **3d. The UI and controls review, on a phone (both places).** The owner asked for a first screen that feels inviting and intuitive, and a better way to change the Manor's floors than the tags. *(PR #9)*
  - **Floors: a lift.** A brass lift panel in the corner, in thumb reach: every floor, top one at the top, yours lit, one press to any floor, a ding (manor.md 38).
  - **The first screen invites you in.** The grey hint line at the bottom is gone. Until you step into a room, a card pinned to one says where to start, with a ring pinging where to tap ("Pick a room, any room" at the Block; "Start with the body" at the Manor, over the library). On the Block, rooms still hiding a goose honk now and then (a "HONK!" bubble), which also shows where's left to look; a whodunit's goose stays quiet.
  - **Teaching when it matters:** your first evidence says to tap Case (and wiggles it); a first room with nothing found after 12 seconds says you can pinch to look closer. The Block's tagline says a goose is in each room; the Manor's is printed straight on the night, without the cream chip.
  - **Checked blind:** a fresh agent saw the old and new first screens, unlabeled. With the new ones it knew where to tap in a second and was sure which floor it was on, how many there are and how to reach the cellar (with the tags it was guessing). Its catches were fixed: the Manor's ring pointed at the landing upstairs, the Manor never said what winning is, and the coral ring looked like the things counter.
  - **The owner's first look, on an iPhone:** the room bar sat on top of the find list once you'd tucked the list away or brought it back (it was measured mid-slide; now it's measured where the list rests and checked every frame, and a smoke check guards it). Found things had loops the size of a table on the whole map (a 16px minimum meant for rooms; now they shrink with the picture past a room's framing, down to a small ring).
  - **The Manor ships:** listed in the picker after the Block. The title screen, which drifts your last place behind it, now reads on a night (manor.md 45).
  - **Found, not fixed (for the owner):** see "The review's leftovers" under Decisions.
- [x] **3b. Faster rooms (from E9).** The room you're in only draws what moves. *(PR #10)*
  - **Still furniture is cached.** Every standing thing not marked `anim` is drawn once into a sheet and stamped back each frame in its place in the depth order, between the people walking around it. Its footprint is measured with a stand-in canvas that draws nothing (`engine/footprint.js`); reading pixels back was far too slow on a GPU canvas. Glows, shadows and shapes kept in a Path2D stay live.
  - **Nothing looks different.** Stamps (and the floor-and-walls cache, which was slightly soft before) land on whole device pixels at the same fraction of a pixel they were drawn at. Cached against live, room by room at a frozen moment: 0.1 to 1% of a room's pixels differ, by a few shades out of 255 (rounding at soft edges). Two things were fixed on the way: a still curtain painted after an animated window was baked *under* it (the old floor-and-walls cache; it now only takes the still layers before the first moving one), and line ends leaked from one drawn thing to the next, so a table's outline could change as someone walked past (every thing now starts from the same line ends and corners).
  - **QA times a room settled.** The test browser paints about one frame a second, so QA used to time a room while its walls were still rising, without any cache: that was the Library's 53 to 84 ms. It now settles the room first. A new QA check fails any still thing that changes over time (it would freeze): two lamps on the Block and the Walk-Up flickered and are now marked `anim`.
  - **Results** (QA, CPU slowed 4x): the Manor's slowest view is The Grounds at 38 ms (the Library 20); the Block's slowest is the Observatory at 32 (it was about 50). A cheap fix to the halftone screens (they were rescaled on every picture, several times a frame) helps every place.
  - **New tool:** `node tools/speed.mjs <place>` times every area and says where the time goes (`--live` turns the caches off to compare).
  - **Left for later (E9):** what's left in a Manor room is mostly things that genuinely move, and a few big animated items that carry still parts with them (the Dining Room's table is one animated item: cloth, plates, wine levels and steam together). Splitting those is room-by-room art work. The Manor's night backdrop costs 5 to 8 ms a frame in a room; neighbors' pictures refresh within a fixed 6 ms budget and could use the same cache to refresh more often.
- [ ] **4. The Block, But Wrong.** The cheapest level on the list (it reuses the Block's layout); proves the pipeline can turn a level around fast. Also a flip mechanic.
- [ ] **5. Terrain and areas (E4, E5).** Ground, water, coastlines and continuous maps, proven on a small hidden test cove.
- [ ] **6. La Dolce Riviera.** The first outdoor showpiece.
- [ ] **7. Casts (E6) and the Catminium.** Cats own the building; replaces the Walk-Up for good.
- [ ] **8. The campaign and onboarding (G1, G2, G4).**
- [ ] **9. Polish and performance (P1 to P4, E9).**
- Then a level every one or two sessions from [LEVELS.md](LEVELS.md), and the case study (P5) once there are five or six.

## Decisions

Open, for the owner:

- **The owner's next sessions** (said at the start of 3d): The Block becomes a real place like the Manor, one connected map rather than sixteen separate rooms; then a beach; then the zoo (The Great Escape in LEVELS.md). What they need: one connected Block most likely wants E5 (areas, not boxes) and people walking between places (walkers, as at the Manor); a beach wants E4 (terrain and water), which La Dolce Riviera also needs; the zoo wants terrain too, and animals as a cast (E6). 3b (faster rooms) shipped first.
- **The review's leftovers** (3d found these and left them for the owner's call):
  - The Block's registration crosshairs, top and bottom center on a phone, look like a recenter button (the blind check read them that way). Keep them as print marks, make them fainter on phones, or drop them there.
  - The things counter ("0/48", a circle) means nothing until your first find; there isn't room on a 390px phone to add the words "geese" and "things". It teaches itself once you find something ("Found: a lucky coin (1/48)").
  - The find list's two round buttons (a chevron to tuck it away, three lines for the whole list) are hard to read at a glance, and its header takes about 100px before the first chip.
  - No double-tap to zoom, which people try on maps.
  - The overview of a whodunit doesn't show which rooms still hold evidence (the Block's honks do that for geese).

- **Casts beyond people:** the Catminium and the zoo need animals as characters. Assumed yes.
- **Delete the Walk-Up?** It's hidden now. Delete it once the Catminium ships, or keep it hidden as a test bed.

Made:

- **Levels in progress are hidden from the picker** and open from a link (`#/manor`) until they ship. *(Session 2)*
- **QA's speed budget is set by The Block:** every view of a new level must render within 60 ms a frame (warn at 40) with the CPU slowed 4x on a GPU canvas; the Block's slowest rooms took about 50 (about 30 since 3b). Headless Chrome without a GPU exaggerates big pictures, so QA measures with one, and it times each room settled (walls up, caches made). *(Session 2, 3b)*
- **QA output (`qa-out/`) isn't committed.** The contact sheet goes to the owner at each gate. *(Session 2)*
- **Gate 2 approved** (the Manor's greybox). *(Session 3)*
- **Area artists work in their own git worktrees**, and the lead decides each room's colors in the style sheet before they start. Ten ran at once without trouble; a session limit cut them all off mid-polish, and the art director finished the loose ends. Artists can't write report files (the harness blocks it), so their report is their final message. While several run at once, QA's tap and speed checks are noisy: rerun them after. *(Session 3)*
- **Saves are v3** (they remember accusations and solved cases); v2 and v1 carry over. *(Session 3)*
- **Gate 3, first review:** session 3's choices stand (manor.md 11 to 21). *(Session 3)*
- **The map is the screen.** The camera has soft edges (it stretches past an edge and springs back, so the map can't be lost); a place opens with its floors in place and fades in, with nothing dropping or bouncing; on a phone the overview fills the screen (The Block fills an upright phone's height and you swipe to its side rooms); a night runs to every edge instead of sitting on paper. *(Session 3)*
- **Calm, with a daily extra (G3):** looking closely stays the core; later, an optional daily goose. No timers or scores on the main places. *(Session 3)*
- **Sound stays synthesized.** *(Session 3)*
- **Controls live on the picture, and back goes up one level** (every place): floors change from tags pinned to the house, not a switch (replaced by the lift in 3d); the back button reads where it goes ("‹ The Manor" in a room, "‹ Places" on the house), replacing the four-square button; on a phone the room bar sits on the find list; the hint line shows until your first find. *(Session 3, manor.md 33 to 36)*
- **Cache still furniture next** (3b), as its own PR before the next level, rather than raising the speed budget. *(Session 3)*
- **Anything that changes over time is `anim`,** even a flicker; everything else is drawn once and cached, and QA fails a still thing that changes. Keep what moves in its own small item. *(3b)*
- **Gooseworth Manor ships** (gate 3): in the picker after the Block, which stays first as the gentler start. The title screen drifts your last place behind it, so on a night it prints its words in the light ink, and the page goes night before the map loads. *(3d, manor.md 45)*
- **Floors change from a lift, not tags:** a fixed panel in thumb reach that shows every floor and the one you're on; tapping a faded floor above and PageUp/PageDown still work. A place can color it (`lift` in its map). *(3d, manor.md 38)*
- **A first visit is invited in, then left alone:** a card pinned to a room until you step into one (`invite` and `words.invite`/`words.hint` in each map), instead of a line of instructions; how-to tips arrive at the moment they matter (the Case button, pinching to look closer). *(3d)*
- **Geese honk from their rooms on the overview** until found, on places whose goal is geese; never in a whodunit. *(3d)*

- **Next level: Gooseworth Manor**, the murder mystery. Brief approved; the goose did it; you can accuse any time. *(planning)*
- **The Walk-Up is retired from the picker:** too similar to the Block. Still opens from a direct link (`#/tower`) and stays as the test bed for stacked floors. *(planning)*
- **Always color.** Every place has its own palette; never a single ink. *(planning)*
- **Diversity over formula.** Every place is a different shape (tall, wide, one big continuous map, a diorama) and its own story to investigate. Giants, trains and the like only where the theme calls for them. The main goal is that every place feels alive. *(planning)*
- **Tone:** adult humor and darkness are welcome (dark comedy, not gore for its own sake). *(planning)*
- **Levels get added often,** so the pipeline, its tools and a growing kit are first-class work. *(planning)*
- **A shared universe:** recurring characters (Inspector Pidge, the Courier) and brands across places, beyond the goose. *(planning)*
- Unlocking places is built but off (`lockMaps: false`) until the campaign (G1) uses it. *(Session 1)*
- Reference images are not stored in the repo; notes and credits live in INSPIRATION.md. *(planning)*
