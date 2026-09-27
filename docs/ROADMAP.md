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

- **Engine:** places made of zones; camera (with soft edges), renderer with cutaways (front, above), snapshots for speed, input. Houses: storeys with a floor switch, walls that drop to waist height, people walking room to room on one clock. Night: a place's own paper, lights that glow, rooms that go dark, lightning and rain.
- **Game:** find the goose and hidden things per zone, hints, tallies, saves (v2), sound, completion. A scene clock tools can set, so any moment of a loop can be shown and tested.
- **Screens:** title with a drifting map, place picker, completion card, a floor switch for houses.
- **Places:** The Block. The Walk-Up is retired from the picker (too close to the Block) but kept as the test bed for stacked floors.
- **Process:** the pipeline ([PROCESS.md](PROCESS.md)) and its tools: `npm run new-level`, the greybox kit, style sheets, `npm run qa` with a contact sheet, a scored blind playtest, and prompts for the area artists, the art director and the playtester ([prompts/](prompts/)).
- **Formats:** a place can be a whodunit (evidence and curiosities, a case file, accusations, a reveal). Saves are v3.
- **Next level:** Gooseworth Manor is drawn, QA'd and playtested, waiting on the owner's gate 3 ([levels/manor.md](levels/manor.md)).

## Engine work

What upcoming levels need that the engine can't do yet. The level that first needs each piece builds it.

- [x] **E0. Pipeline tools.** Scaffold a new level in one step; a style sheet per level; a QA command (errors, performance, finds on screen and tappable, label and copy rules, contact sheet); prompt templates for area artists, the art director and the playtester. *Session 2.*
- [x] **E1. Night and weather.** A palette per place, lights that glow (windows, lamps, candles), lightning, rain. *Session 2.*
- [x] **E2. Houses.** Inside walls cut low in the overview and full height inside a room; one storey at a time with a floor switch; people passing between rooms through doors on a shared timeline. *Session 2. Next used by the Catminium and the cruise ship.*
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
- [ ] **3. The Manor.** The whodunit format (E3), area art by parallel agents, art direction, QA and a blind playtest, preview for gate 3, ship. *Done when: a fresh player can solve the case, every find is fair, and it passes QA.* **Built and at gate 3 (PR #7):** E3, all eleven rooms and the exterior, the art direction pass, QA clean, the blind playtest. The owner's first review is in (manor.md, decisions 22 to 26: a mystery card that gives nothing away, no giveaway captions, the night to every edge, soft edges, a calm start, phone framing). **The difficulty pass is done (PR #8):** every piece of evidence hidden among look-alikes (manor.md 28), blind-playtested, and the cream strips behind Safari's bars traced and fixed (29). **Next:** the owner's look on an iPhone (the open points at the end of manor.md), then approval; then take `hidden` off in `src/maps/index.js`.
- [ ] **3b. Faster rooms (from E9).** Cache the still furniture of the room you're in, as floors and walls are cached today, so the Manor's rooms (39 to 59 ms a frame on a slowed-down phone) get well under the 60 ms budget and denser levels have room. Its own small PR, before the next level. *Done when: QA's slowest Manor room is under 40 ms and nothing looks different.*
- [ ] **4. The Block, But Wrong.** The cheapest level on the list (it reuses the Block's layout); proves the pipeline can turn a level around fast. Also a flip mechanic.
- [ ] **5. Terrain and areas (E4, E5).** Ground, water, coastlines and continuous maps, proven on a small hidden test cove.
- [ ] **6. La Dolce Riviera.** The first outdoor showpiece.
- [ ] **7. Casts (E6) and the Catminium.** Cats own the building; replaces the Walk-Up for good.
- [ ] **8. The campaign and onboarding (G1, G2, G4).**
- [ ] **9. Polish and performance (P1 to P4, E9).**
- Then a level every one or two sessions from [LEVELS.md](LEVELS.md), and the case study (P5) once there are five or six.

## Decisions

Open, for the owner:

- **The Manor's preview (gate 3):** the first reviews' changes and the difficulty pass are made ([levels/manor.md](levels/manor.md), decisions 22 to 31). Open: Safari's bars on a real iPhone (29), the zoomed-in overview on the owner's phone, and moving the room bar down to the find list on phones (a proposal).

- **Casts beyond people:** the Catminium and the zoo need animals as characters. Assumed yes.
- **Delete the Walk-Up?** It's hidden now. Delete it once the Catminium ships, or keep it hidden as a test bed.

Made:

- **Levels in progress are hidden from the picker** and open from a link (`#/manor`) until they ship. *(Session 2)*
- **QA's speed budget is set by The Block:** every view of a new level must render within 60 ms a frame (warn at 40) with the CPU slowed 4x on a GPU canvas; the Block's slowest rooms take about 50. Headless Chrome without a GPU exaggerates big pictures, so QA measures with one. *(Session 2)*
- **QA output (`qa-out/`) isn't committed.** The contact sheet goes to the owner at each gate. *(Session 2)*
- **Gate 2 approved** (the Manor's greybox). *(Session 3)*
- **Area artists work in their own git worktrees**, and the lead decides each room's colors in the style sheet before they start. Ten ran at once without trouble; a session limit cut them all off mid-polish, and the art director finished the loose ends. Artists can't write report files (the harness blocks it), so their report is their final message. While several run at once, QA's tap and speed checks are noisy: rerun them after. *(Session 3)*
- **Saves are v3** (they remember accusations and solved cases); v2 and v1 carry over. *(Session 3)*
- **Gate 3, first review:** session 3's choices stand (manor.md 11 to 21). *(Session 3)*
- **The map is the screen.** The camera has soft edges (it stretches past an edge and springs back, so the map can't be lost); a place opens with its floors in place and fades in, with nothing dropping or bouncing; on a phone the overview fills the screen (The Block fills an upright phone's height and you swipe to its side rooms); a night runs to every edge instead of sitting on paper. *(Session 3)*
- **Calm, with a daily extra (G3):** looking closely stays the core; later, an optional daily goose. No timers or scores on the main places. *(Session 3)*
- **Sound stays synthesized.** *(Session 3)*
- **Cache still furniture next** (3b), as its own PR before the next level, rather than raising the speed budget. *(Session 3)*

- **Next level: Gooseworth Manor**, the murder mystery. Brief approved; the goose did it; you can accuse any time. *(planning)*
- **The Walk-Up is retired from the picker:** too similar to the Block. Still opens from a direct link (`#/tower`) and stays as the test bed for stacked floors. *(planning)*
- **Always color.** Every place has its own palette; never a single ink. *(planning)*
- **Diversity over formula.** Every place is a different shape (tall, wide, one big continuous map, a diorama) and its own story to investigate. Giants, trains and the like only where the theme calls for them. The main goal is that every place feels alive. *(planning)*
- **Tone:** adult humor and darkness are welcome (dark comedy, not gore for its own sake). *(planning)*
- **Levels get added often,** so the pipeline, its tools and a growing kit are first-class work. *(planning)*
- **A shared universe:** recurring characters (Inspector Pidge, the Courier) and brands across places, beyond the goose. *(planning)*
- Unlocking places is built but off (`lockMaps: false`) until the campaign (G1) uses it. *(Session 1)*
- Reference images are not stored in the repo; notes and credits live in INSPIRATION.md. *(planning)*
