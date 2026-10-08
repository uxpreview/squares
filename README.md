# Goose at Large

A hidden-object picture book you can walk through. Tiny animated places, drawn entirely in code in a six-ink risograph style, and every one has a loose goose.

- **Title screen:** the current place drifts behind the title. **Play** (or **Continue**) and **All places**.
- **Pick a place:** one card per map, with a live picture and your progress.
- **Playing:** tap a room or floor to step inside. Drag to pan, pinch or scroll to zoom. Every zone hides the goose plus three things. Tap them to circle them in pen. **Hint** gives you a nudge. Find every goose in a place to finish it. A first visit gets a card pinned to a room saying where to start; on the whole map, rooms that still hide their goose honk now and then. A house changes floors from its lift, in the corner.
- **Keys:** Tab to the map and a print mark appears in the middle of the picture. The arrow keys (or WASD) move the map under it, and the mark itself where the map can't go any further; **Enter** or **Space** taps whatever's under the mark; **+** and **−** zoom; **Escape** goes back a level. When the map doesn't have focus, left and right step between rooms and Page Up and Page Down change floors. Everything else (the list, hints, the lift, the case file) is ordinary buttons.
- **Screen readers:** the map is named for what it shows and described (every area and every place has a description of its picture), arriving somewhere and anything that answers a tap is read out, and finds are announced as you circle them.
- **Whodunits** (Gooseworth Manor): the finds are **evidence** and **curiosities**, and the goal is solving the case. **Case** opens the case file: every suspect, what points at them, their alibi, and **Accuse**. Accuse anyone, any time; the wrong one gives you their alibi (and a joke), and the culprit stays a mystery until you've found every clue against them.
- **Houses you open** (Moving Day): on the whole map the houses are closed; tap a floor and its front comes off and the floors above it lift away. Some things are only there before noon (the old tenants') or after (the new ones'), and the list says which; the lease clock in the corner skips to noon, sunset and the next morning.
- **The tide** (Plum Island): the water rises and falls on the clock, and some things only show at low tide (the list says so). The dial in the corner says what the tide's doing; tap it to skip ahead to the next low water, sunset or high water.

Progress is saved in the browser. Links go straight to a place or a zone: `/#/block`, `/#/block/laundromat`, `/#/tower/roof`. Old links like `/#laundromat` still work. Places still being made (or retired, like the Walk-Up) are hidden from the picker but open from a link: `/#/tower`.

## Run it

```
npm install                   # once
npm run dev                   # play it locally, reloads as you edit
npm run build                 # make the site in dist/
npm run smoke                 # click through the whole game and check nothing broke
npm run new-level -- beach    # start a new place from its brief (docs/levels/beach.md)
npm run qa -- manor           # check a place and make its contact sheet (qa-out/manor/)
```

Vercel builds it on its own (`vercel.json` tells it how: `npm run build`, output `dist`).

## New computer setup

The game itself only needs Node. The checking tools (smoke, QA, screenshots, the playtest, speed) drive a real browser with Playwright, which is a dev dependency, so it comes with `npm install`. The browser it drives is a separate download, once per computer.

1. Install Node 20 or newer (`node -v` to check). The installer from nodejs.org is fine.
2. Get the code and install:
   ```
   git clone https://github.com/uxpreview/squares.git
   cd squares
   npm install
   ```
3. Download Playwright's browser (about 150 MB, kept outside the project, shared by every project on the computer):
   ```
   npx playwright install chromium
   ```
4. Check everything works:
   ```
   npm run build                                 # should end with "built in ..."
   npm run smoke                                 # should end with "All good"
   node tools/shoot.mjs block out.png --mobile   # a picture of the Block Party, as a phone sees it
   npm run qa -- block                           # passes, and makes qa-out/block/contact.jpg
   ```
5. `npm run dev` and open the address it prints. It also prints a Network address: open that on a phone on the same wifi to play on the phone.

Playwright is pinned to 1.61 in `package.json` on purpose: it's the last version whose browser runs on macOS 13 (Ventura). On macOS 14 or newer it can be raised (`npm install -D playwright@latest`, then step 3 again). If a tool says it can't find the browser ("Executable doesn't exist"), run step 3.

QA's speed check times a slowed-down phone on this computer's processor, so its numbers vary a little from one computer to another (the budget has room for it).

## How it's put together

The game is made of **places** (maps). A place is made of **zones**: a room on the Block Party, a floor of The Walk-Up. The engine doesn't care what a zone is; the map decides where each one sits.

```
src/
  main.js          Boots the game, the address bar (#/...), the scene clock, the frame loop
  config.js        Game-wide switches: locking places, the back link, the tagline
  engine/          Drawing and moving around. Knows nothing about geese or scores.
    iso.js           The 3D-to-screen math and zone size
    art.js           The ink box: palette, halftone dots, glows, people, the goose, furniture
    actors.js        Motion helpers: walking routes, orbits, particles, people on a clock
    weather.js       A storm (lightning on a schedule), bolts, rain
    zone.js          Turns a zone file into layers; walls that drop down; lights and dark;
                     zones of any size or shape, drawn in chunks; caching the still parts
                     of the room you're in
    footprint.js     A stand-in canvas that measures how far a drawing reaches
    world.js         Places a map's zones in space, and sorts their chunks for drawing:
                     storeys, doors, "which zone did I tap"
    camera.js        Framing, flights between views, the title-screen drift, the map's soft edges
    renderer.js      Draws a world every frame; cutaways and floors lifting; the fade-in
    terrain.js       Ground with height and water with a level (a land): tracing its layers,
                     printing each area's part, the tide, waves, wading, floating
    input.js         Touch, mouse and wheel; stretching past an edge and springing back
  game/            The rules
    play.js          Playing a map: tapping, finding, hints, tallies, the lift, the invitation, the reveal
    case.js          Level formats: a place's goal, evidence and curiosities, accusations
    store.js         Saved progress and settings (and upgrading old saves)
    audio.js         Every sound, synthesized (honk, pen, thunder...), and the mix of beds under a place
    beds.js          Sounds that loop under a place (the street, the sea, rain, a dryer, a band far off)
    synth.js         What sounds are built from (noise, tones, loops baked from a recipe)
  ui/
    screens.js       Title, place picker, the "place complete" card
    tray.js          The find list (chips, the full list, hidden/peek/open)
    casefile.js      A whodunit's case file: suspects, evidence, accusations
  maps/
    index.js         The list of places, in picker order
    shared.js        Print marks, birds and the goose victory lap, for any map
    greybox.js       The greybox kit: blocks, labels and pins for laying out a new place
    block/           The Block Party: 16 rooms on a city block, on the day of the party
      rooms/           One file per room
      fronts/          Each room's street front: its sign, its door, its busy hour
      areas/           Main Street, the alleys, the pavement
      plan.js          Where every room, street and door sits, and the lanes people walk
      style.js         The streets' inks, the paper through the day, lamp posts, bunting, litter
      clock.js         The day's hours, and each room's opening hours and rush
      day.js           The day's light, and everyone's day on the streets
      finale.js        The ending: the conga round Main Street and the sock
      sound.js         The mix (the street through the day, each room inside) and the day's cues
      ambient.js       The blimp and the paper plane
    tower/           The Walk-Up: 4 floors, pulled apart like an exploded diagram
    manor/           Gooseworth Manor: a murder mystery in a house at night, 3 floors, 11 areas
      plan.js          Where every area sits, the doors and the stairs
      style.js         The style sheet: inks, room colors, the storm, lights, the cast in costume
      evening.js       Everyone's 3-minute evening, room to room, and what lightning shows
      case.js          The case file: suspects, clues, alibis, what they say, the reveal
      sound.js         The mix (rain and wind, a fire or the clock in each room) and cues (thunder, midnight)
      ambient.js       The night, the lawn, the tower, rain and lightning
      areas/           One file per area
    crossroads/      A hidden test bed (#/crossroads): a street and a pavement of any shape
                     between four rooms, with people walking between them
    plum/            Plum Island: a barrier island on a tide
      land.js          The island's ground and water: its outline, the dunes, the marsh, the roads
      tide.js          The day, the tide's level, when the flats are out, the dial
      style.js         The style sheet: the North Shore inks, the sea through the day, the night print, Gander Cola
      day.js           The Courier and his van, Every King Tide Dave, the traffic, the greenhead man, on the clock
      swarm.js         The greenhead man's walk, and aside(): anyone near it steps out of the way
      kit.js           Shared pieces: cars, boats, beach houses (lit at night), umbrellas, traps, signs, gulls
      ambient.js       Around the island: Newburyport, the Salisbury jetty, sun, moon, stars, the banner plane
      sound.js         The mix (surf, wind, the river, the beach crowd, by area and hour), and cues on the clock (the bridge's bell, the plane, Dave's horn)
    cruise/          All-You-Can-Eat: a whodunit on a cruise ship, four decks (hidden until it ships)
      plan.js          The decks, the areas on them, the doors, the lift, the bow's taper, the waterline
      style.js         The style sheet: the inks, the sea through the day, the day's clock, who goes green when, the cast
      ship.js          The deck every area stands on: floor, hull, walls and doors, the lift
      kit.js           Shared pieces: signs, portholes, loungers, buckets, the Green Mermaid, passengers who go green
      day.js           Everyone's day, 7am to 7pm, deck to deck in the lift
      case.js          The case file: who is patient zero?
      ambient.js       The sea: the wake, the waterline, the sea over the crew deck
      sound.js         The mix (the sea, the engines, the steel band, each room inside), and cues on the clock (the drill, bingo, the port's welcome)
      finale.js        The ending: the geese swim out to the Courier's van
      areas/           One file per area, in the land's own units
    southie/         Moving Day: a row of triple-deckers on Farragut Road, South Boston, on September 1st
      plan.js          Where everything is: the row, the road, Marine Park, Pleasure Bay, Castle Island
      clock.js         The day (out by noon, in after), the rain, the lease clock on screen
      land.js          The ground and water: the park, the beach, the bay, the causeways, the island
      style.js         The style sheet: the siding colors, the paper through the day and the rain
      kit.js           The triple-decker: a floor of a house, its stairs, porches and outside; the rest of the row
      day.js           Everyone on the clock: the Courier, the landlady, the movers, the curb collector
      finale.js        The ending: the geese bring the couch in
      sound.js         The mix (the road, the harbor, the rain, each apartment inside) and the day's cues
      ambient.js       Around it: City Point's rooftops, Dorchester Heights, the Seaport, the planes, the rain
      areas/           Nine apartments (a file per floor of each house) and three outdoor areas
index.html         The page: every screen's markup
styles.css         Every screen's look
tools/
  shoot.mjs        Screenshot any screen, place or zone, at any moment
  tour.mjs         An area pinched in on a phone, tile by tile, at chosen moments
  sound.mjs        How loud every bed is, and a place's mix in every area, against a honk
  smoke.mjs        The click-through test
  new-level.mjs    Scaffold a new place from its brief
  qa.mjs           Check a place and make its contact sheet
  playtest.mjs     A blind playtest from screenshots, scored
  speed.mjs        How fast each area draws on a slowed-down phone, and where the time goes
  fps.mjs          Frames per second on this computer's own graphics, in a real window
  load.mjs         How fast the title shows on a slow phone connection, from a build
  covered.mjs      People drawn inside solid things, finds painted over (QA runs it too)
  icons.mjs        The app icons and favicon.ico, drawn from public/favicon.svg
  ROOM_BRIEF.md    The brief for drawing a new zone
docs/
  ROADMAP.md, PROCESS.md, LEVELS.md, INSPIRATION.md   The plans
  levels/          One brief per place (and the template)
  prompts/         Prompts for the area artists, the art director and the playtester
```

## Common changes

| I want to... | Change this |
| --- | --- |
| Lock places until you've found enough geese | `lockMaps: true` in `src/config.js`, and each place's `unlock.geese` in `src/maps/index.js` |
| Remove the "← Lab" link when the game lives on its own address | `backLink: null` in `src/config.js` |
| Change the game's name, the title screen's wordmark or its tagline | `name`, `wordmark` (a line each) and `tagline` in `src/config.js`; the name is also in `index.html`'s head and `public/site.webmanifest` |
| Rename a place or change its picker blurb | `src/maps/index.js` (picker) and that place's `map.js` (in-game) |
| Change the palette | `C` at the top of `src/engine/art.js`. Every zone pulls from it. |
| Change a zone's name, story or finds | The top of its file (`id`, `name`, `blurb`) and its `R.find(...)` calls |
| Swap or reorder rooms on the Block Party | `GRID` and `AT` in `src/maps/block/plan.js` (the streets are laid out round them) |
| Hide the "more places on the way" card | `teaseMore: false` in `src/config.js` |
| Change a sound, or add one | `src/game/audio.js` (one-off sounds) or `src/game/beds.js` (sounds that loop under a place) |
| What a place sounds like, by the hour and room by room | `bed` in that place's `sound.js`: it gives a level for each bed (0 to 1) and how muffled the outdoors is (`muffle`), from the clock and where you are |
| Turn a bed up or down everywhere | `LEVEL` at the top of `src/game/beds.js`, then `node tools/sound.mjs` (every bed) or `node tools/sound.mjs <place>` to check it's still under a honk (QA checks too) |
| How quiet a cue is from another room | `cueLevel` in `src/game/play.js` (a cue with a `zone` plays quieter and muffled from anywhere else) |
| Change what finishing a place says | `words.complete` in that place's `map.js`; the card itself is in `src/ui/screens.js` |
| Change the title screen's drift | `startDrift` in `src/engine/camera.js` |
| How far the map stretches past its edge | `stretch` at the top of `src/engine/camera.js`; how it springs back and brakes is `step` in `src/engine/input.js` |
| How far you can pan and zoom out | The map's box (`mapBox` in `src/game/play.js`: every zone plus the overview) and `clampZoom` next to it |
| What a place's overview frames (on a phone, a desk, a phone on its side) | `overview` in its `map.js`; places without one use `overviewBox` in `src/engine/world.js`, which fills a phone |
| How a place fades in when it opens | `startIntro` and `INTRO_MS` in `src/engine/renderer.js`; picked from the picker it grows out of its card instead (`cardView` in `src/main.js`, the picker's fade in `show` in `src/ui/screens.js`) |
| Double tap to zoom (how quick, how close) | `lastTap` and `zoomAt` in `src/engine/input.js` |
| The crosshairs round a place's sheet | `reg` in `src/maps/shared.js` (not drawn on a touch screen) |
| How soon the title shows on a phone | The wordmark's font is preloaded in `index.html`; `boot` in `src/main.js` waits for it alone on the title. Measure with `npm run build && node tools/load.mjs`. Other places' code is fetched behind the title (`warm` in `src/main.js`) |
| Change how floors lift away (and dim below) in a building | `LIFT`, `GHOST` and `BELOW` at the top of `src/engine/renderer.js` |
| Sharpness vs. speed | The steps sharpness takes when frames stay slow (3x, 2x, 1.5x, 1.25x) and back up when they're quick: `SHARP` and `watchFrameRate` in `src/engine/renderer.js` (tools keep one sharpness unless they set `camera.view.dprAuto`); neighbor picture sizes are `SNAP_STEPS` there too |
| How the room you're in is cached (its floor and walls, and every still thing) | "Still things" in `src/engine/zone.js`; anything that changes over time must be `{ anim: true }` (QA checks). To see it without the caches: `window.__squares.renderer.caching = false` in the browser console |
| Keyboard play (how fast the arrows move the map, which keys do what) | "Keys" in `src/engine/input.js` (`keyPan`, `zoomBy`); the mark is `#aim` in `index.html`, placed by `placeAim` in `src/game/play.js`, where the map gets its name and description (`nameMap`) |
| What a screen reader hears for a picture | `describe` after the `blurb` in each area's file, and `words.describe` in a place's `map.js` (QA's copy check wants both, under 60 words) |
| The page's title, description, share tags and icons | The `<head>` of `index.html` (title, description, Open Graph, the JSON-LD), `public/site.webmanifest`, `public/robots.txt`, `public/sitemap.xml`; the icons come from `public/favicon.svg` with `node tools/icons.mjs`. The page's title follows where you are (`titled` in `src/main.js`) |
| Small text in a light ink (coral, teal) | `--coral-text` and `--teal-text` at the top of `styles.css`: the same inks mixed with the navy, so small labels pass 4.5 to 1 |
| Find people drawn inside furniture and finds painted over | `node tools/covered.mjs <place> --shots` (close-ups in `qa-out/covered/`); QA runs it as its `covered` check and puts the close-ups on the contact sheet. They're warnings: someone behind a lamp post is fine, someone inside a counter isn't |
| See how fast a place draws, room by room | `node tools/speed.mjs <place>` (`--live` for no caches); QA's speed check uses the same setup |
| See whether a place is smooth on this computer | `node tools/fps.mjs <place>` opens a real window and counts frames per second in every view (`--size=1440x800 --dpr=2`; `--only=` some views; `--eval=` some JavaScript first, to switch a part off and see what it costs; `--auto` lets sharpness step down on slow frames as it does for players, and says where each view ended up). QA can't see this: it times the drawing code, not the graphics chip putting the picture on screen, which is what lags on an older laptop. Close anything else running the game first (another browser tab, an editor's preview pane): it shares the graphics chip and takes a quarter off the numbers |
| How the map in front of the room you're in is cut away | "The cut layer" in `src/engine/renderer.js` (drawn on a see-through sheet, the room's outline erased, laid on the picture) |
| Plum Island's ground: the island's shape, the dunes, the marsh, the roads | `src/maps/plum/land.js` (outline points, heights, and the layers' colors in `style.js`); `npm run qa -- plum` fails ground that climbs toward you too steeply |
| When the tide's in or out, and when tide-only finds show | `TURNS`, `lowTide`, `highTide` and `SUNSET` in `src/maps/plum/tide.js`; where the dial skips to (low water, sunset, high water) is its `next` |
| Plum Island's sea through the day (the sunset's pink and lavender) | `SEA` and `paperAt` in `src/maps/plum/style.js` |
| Who steps aside for the greenhead swarm | `aside(x, y, t)` from `src/maps/plum/swarm.js`, added to where someone stands in their area's file |
| Plum Island's sounds | `src/maps/plum/sound.js` (the mix and when each cue plays); the cues (`bridgebell`, `prop`, `lap`) are in `src/game/audio.js`, the beds in `src/game/beds.js` |
| Who goes green on the cruise ship, and when | `SICK` and `HERRING` in `src/maps/cruise/style.js` (an area's own passengers: `passenger(R, x, y, seed, { sick })` in its file) |
| The cruise ship's day and the dial's skips | `at()`, `MOMENTS` and `seaAt` in `src/maps/cruise/style.js`; everyone's walk is `src/maps/cruise/day.js` |
| A flat thing that changes only now and then (the evening's ground) | `step: (t) => n` on it: it's baked into the room's cached floor and baked again when its step changes (see "step" in `src/engine/zone.js`) |
| Make a find show only some of the time | `when: (t) => true or false` and `note: 'low tide'` on the find (`R.find` or the greybox's `pin`) |
| How often the other rooms' pictures refresh | `SNAP_BUDGET_MS` in `src/engine/renderer.js`; it shrinks by itself (`snapQ`) when frames are slow |
| Find list look and behavior | `src/ui/tray.js`; styles under "The tray" in `styles.css` |
| A house's floors, and which one it opens on | `storeys` and `storey` in its `map.js` (the Manor: `src/maps/manor/map.js`) |
| How low inside walls drop, how far floors lift | `cutaway.walls`, `cutaway.lift`, `cutaway.ghost` in the map's `map.js` |
| How the lift (the floor buttons) looks | "The lift" in `styles.css`; a place's own colors (the Manor's brass) are `lift` in its `map.js` |
| What a first visit is invited to do, and where the card points | `words.invite` and `words.hint` (what it says) and `invite` (which room, where the ring pings, where the card pins) in the place's `map.js`; the card's look is "The invitation" in `styles.css` |
| How often rooms honk on the overview | `CALL_EVERY` in `src/game/play.js` (the bubble is `callBubble` next to it) |
| How big the pen circles around found things are | `drawMarks` in `src/game/play.js`: 16px in a room, shrinking with the picture when you zoom out, never under 5px |
| The lift's ding | `ding` in `src/game/audio.js` |
| Make an area that isn't a 16 x 16 room (a street, a square) | `size: [w, d]` or `shape: [[x0, y0, x1, y1], ...]` in its zone file (see `src/maps/crossroads/areas/street.js`, and "Chunks" in `src/engine/zone.js`) |
| Who's where at the Manor, and when | `src/maps/manor/evening.js` (doors and stairs are in `plan.js`) |
| Who's where at the Block Party, and when | `src/maps/block/day.js` (doors, streets and lanes are in `plan.js`) |
| The Block Party's colors through the day | `PAPER` in `src/maps/block/style.js` (the hours); how dark night gets is `nightK` and `nightfall` in `day.js` |
| How far a room's picture reaches past its corners (for a sign hanging over the street) | `REACH` in `src/maps/block/map.js` (`reach` on any zone's place; QA's pictures check says when one's cut off) |
| How loud the street is against the honks | `BEDS.street` and the cues in `src/game/audio.js`; `loudness()` there measures them |
| Where a room's door onto the street goes | `DOORS` in `src/maps/block/plan.js` (a map can cut doors in any zone's walls: `doors` on its place) |
| How much of a long area (a street) a tap frames | `zoneBox` in `src/engine/world.js` (a room's worth round the spot you tapped); where it frames by default is `home` in the area's file |
| When the Manor's lights go out, how often lightning strikes | `lightsOut` and `storm` in `src/maps/manor/style.js` |
| What QA expects of a place (finds per area, key moments) | `qa` in its `map.js`; the checks and budgets are at the top of `tools/qa.mjs` |
| The Manor's suspects, clues, alibis and what they say | `src/maps/manor/case.js` |
| Which finds are evidence | Any find the case file names (`against` or `alibi`); the rest are curiosities |
| Where the reveal happens, and what the closing card says | `reveal` in `src/maps/manor/case.js` (the goose's chair is drawn in `areas/dining-room.js`) |
| How a room looks at the Manor (wallpaper, floor, woodwork) | `ROOM` and `MAT` in `src/maps/manor/style.js` |
| A character's costume at the Manor | `COSTUME` in `src/maps/manor/style.js` |
| Thunder, the rain, the fires, the clock at midnight | `src/maps/manor/sound.js`; the sounds are in `src/game/audio.js` and `src/game/beds.js` |
| The case file's look | "The case file" in `styles.css` |

## Adding a place

The whole pipeline is in `docs/PROCESS.md`. In short: write the brief (`docs/levels/beach.md`, from the template), then `npm run new-level -- beach`. That reads the brief's areas and palette and makes the folder, the map, a style sheet, the backdrop and sky, a greybox file per area, and lists the place (hidden until it ships). Then:

1. Arrange the areas in `src/maps/beach/map.js` and block each one out with `src/maps/greybox.js`.
2. `npm run qa -- beach` checks it and makes a contact sheet for the owner's greybox gate.
3. Area art: one agent per area with `docs/prompts/area-artist.md`, then `docs/prompts/art-director.md`, then a blind playtest with `docs/prompts/playtester.md`.

What a map file holds (`src/maps/beach/map.js`; see `tower/map.js` or `manor/map.js`):
   - `zones`: each zone file and where it sits, `at: [x, y, z]` in world units. A zone is 16 x 16. Side by side with no gap (`[0,0,0]`, `[16,0,0]`...) makes one continuous place like a beach; gaps make separate rooms; stacking `z` makes floors.
   - `cutaway`: `{ front: true }` cuts away zones in front of the one you're in (the block). `{ above: true }` lifts zones above it out of the way (a building). `walls: 1.2` drops inside walls to waist height except in the room you're in (a house). Use `{}` for an open place where nothing is in the way.
   - `words`: what the invitation and messages say ("Pick a cove, any cove", "Tap one to step inside.").
   - `invite` (optional): where a first visit's invitation points: `{ zone, at, pin }` (see `block/map.js`).
   - `backdrop` and `sky` (optional): art drawn under and over the whole place. See `tower/ambient.js`.
   - `storeys` (optional): named floors, with a lift panel to change them (see the Manor).
   - `walkers` (optional): people who walk from area to area on one clock (see `manor/evening.js`).
   - `case` (optional): makes the place a whodunit (see `manor/case.js` and the top of `src/game/case.js`).
   - `sound` (optional): `bed`, the beds that loop while you're there (one name, or a function of the clock and where you are that gives each bed a level, see `block/sound.js`), and `cues` on the place's clock.
4. It's listed in `src/maps/index.js`; take `hidden: true` off when it ships.
5. Check it: `node tools/shoot.mjs beach out.png`, `node tools/shoot.mjs beach/pier out.png --mobile`, `npm run qa -- beach`, then `npm run smoke`.

Each place loads only when someone opens it, so adding places doesn't slow down the first visit.

## Saved progress

Saved in the browser under `squares.save.v4`: what's been found per place, each whodunit's case (who you've accused, whether it's solved), the sound setting, and where you left off. Saves from earlier versions (`squares.save.v2`, `squares.found.v1`) are carried over on first load. If you change the save's shape, bump the version in `src/game/store.js` and teach `migrate()` to upgrade the old one, so nobody loses their geese.

## Deploying

Goose at Large lives at `squares.ryankm.com` (until gooseatlarge.com is registered; the repo, the folder and the saves' keys still say squares) and is listed on ryankm.com/lab as EXP-044. It's a Vite site: Vercel runs `npm run build` and serves `dist/`. The built game uses relative paths, so it also works from a subfolder. `vercel.json` also tells browsers to keep the built files (their names change with every build) for a year.
