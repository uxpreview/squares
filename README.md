# Squares

A hidden-object picture book you can walk through. Tiny animated places, drawn entirely in code in a six-ink risograph style, and every one has a loose goose.

- **Title screen:** the current place drifts behind the title. **Play** (or **Continue**) and **All places**.
- **Pick a place:** one card per map, with a live picture and your progress.
- **Playing:** tap a room or floor to step inside. Drag to pan, pinch or scroll to zoom. Every zone hides the goose plus three things. Tap them to circle them in pen. **Hint** gives you a nudge. Find every goose in a place to finish it.

Progress is saved in the browser. Links go straight to a place or a zone: `/#/block`, `/#/block/laundromat`, `/#/tower/roof`. Old links like `/#laundromat` still work.

## Run it

```
npm install        # once
npm run dev        # play it locally, reloads as you edit
npm run build      # make the site in dist/
npm run smoke      # click through the whole game and check nothing broke
```

Vercel builds it on its own (`vercel.json` tells it how: `npm run build`, output `dist`).

## How it's put together

The game is made of **places** (maps). A place is made of **zones**: a room on The Block, a floor of The Walk-Up. The engine doesn't care what a zone is; the map decides where each one sits.

```
src/
  main.js          Boots the game, the address bar (#/...), the frame loop
  config.js        Game-wide switches: locking places, the back link, the tagline
  engine/          Drawing and moving around. Knows nothing about geese or scores.
    iso.js           The 3D-to-screen math and zone size
    art.js           The ink box: palette, halftone dots, people, the goose, furniture
    actors.js        Motion helpers: walking routes, orbits, particles
    zone.js          Turns a zone file into layers; snapshots for speed
    world.js         Places a map's zones in space; "which zone did I tap"
    camera.js        Framing, flights between views, the title-screen drift
    renderer.js      Draws a world every frame; cutaways; the drop-in intro
    input.js         Touch, mouse and wheel
  game/            The rules
    play.js          Playing a map: tapping, finding, hints, tallies, finishing
    store.js         Saved progress and settings (and upgrading old saves)
    audio.js         Every sound, synthesized (honk, pen, tick, fanfare)
  ui/
    screens.js       Title, place picker, the "place complete" card
    tray.js          The find list (chips, the full list, hidden/peek/open)
  maps/
    index.js         The list of places, in picker order
    shared.js        Print marks, birds and the goose victory lap, for any map
    block/           The Block: 16 rooms on a 4x4 plate
    tower/           The Walk-Up: 4 floors, pulled apart like an exploded diagram
index.html         The page: every screen's markup
styles.css         Every screen's look
tools/
  shoot.mjs        Screenshot any screen, place or zone
  smoke.mjs        The click-through test
  ROOM_BRIEF.md    The brief for drawing a new zone
```

## Common changes

| I want to... | Change this |
| --- | --- |
| Lock places until you've found enough geese | `lockMaps: true` in `src/config.js`, and each place's `unlock.geese` in `src/maps/index.js` |
| Remove the "← Lab" link when Squares lives on its own | `backLink: null` in `src/config.js` |
| Change the title screen tagline | `tagline` in `src/config.js` |
| Rename a place or change its picker blurb | `src/maps/index.js` (picker) and that place's `map.js` (in-game) |
| Change the palette | `C` at the top of `src/engine/art.js`. Every zone pulls from it. |
| Change a zone's name, story or finds | The top of its file (`id`, `name`, `blurb`) and its `R.find(...)` calls |
| Swap or reorder rooms on The Block | The `ROOMS` list in `src/maps/block/map.js` |
| Hide the "more places on the way" card | `teaseMore: false` in `src/config.js` |
| Change a sound, or add one | `src/game/audio.js` |
| Change what finishing a place says | `words.complete` in that place's `map.js`; the card itself is in `src/ui/screens.js` |
| Change the title screen's drift | `startDrift` in `src/engine/camera.js` |
| Change how floors lift away in a building | `LIFT` and `GHOST` at the top of `src/engine/renderer.js` |
| Sharpness vs. speed | `dprCap` in `src/engine/camera.js`; neighbor picture sizes are `SNAP_STEPS` in `src/engine/renderer.js` |
| Find list look and behavior | `src/ui/tray.js`; styles under "The tray" in `styles.css` |

## Adding a place

1. Make a folder: `src/maps/beach/`.
2. Draw its zones, one file each (`src/maps/beach/zones/pier.js`, ...). Follow `tools/ROOM_BRIEF.md`; you can hand that brief to an AI agent per zone.
3. Write `src/maps/beach/map.js`. Copy `tower/map.js` and change:
   - `zones`: each zone file and where it sits, `at: [x, y, z]` in world units. A zone is 16 x 16. Side by side with no gap (`[0,0,0]`, `[16,0,0]`...) makes one continuous place like a beach; gaps make separate rooms; stacking `z` makes floors.
   - `cutaway`: `{ front: true }` cuts away zones in front of the one you're in (the block). `{ above: true }` lifts zones above it out of the way (a building). Use `{}` for an open place where nothing is in the way.
   - `words`: what the hint line and messages say ("Tap a stretch of beach...").
   - `backdrop` and `sky` (optional): art drawn under and over the whole place. See `tower/ambient.js`.
4. Add a line for it in `src/maps/index.js`.
5. Check it: `node tools/shoot.mjs beach out.png`, `node tools/shoot.mjs beach/pier out.png`, then `npm run smoke`.

Each place loads only when someone opens it, so adding places doesn't slow down the first visit.

## Saved progress

Saved in the browser under `squares.save.v2`: what's been found per place, the sound setting, and where you left off. Saves from the first version (`squares.found.v1`) are carried over on first load. If you change the save's shape, bump the version in `src/game/store.js` and teach `migrate()` to upgrade the old one, so nobody loses their geese.

## Deploying

Squares lives at `squares.ryankm.com` and is listed on ryankm.com/lab as EXP-044. It's a Vite site: Vercel runs `npm run build` and serves `dist/`. The built game uses relative paths, so it also works from a subfolder.
