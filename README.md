# Squares

Sixteen tiny animated rooms and one loose goose. An isometric hidden-object picture book (a wimmelbild) drawn entirely in code, in a six-ink risograph style.

- Tap a room to step inside. Drag to pan, pinch or scroll to zoom.
- Every room hides the goose plus three things. Tap them to circle them in pen. **Hint** gives you a nudge.
- **Play tour** glides the camera through every room. It starts on its own if you leave the map alone.
- Find all sixteen geese for a victory lap.

Progress is saved in your browser. Link straight to a room with its id, e.g. `/#laundromat`.

## Run it

It's a static site with no build step. Serve the folder with anything:

```
npx serve .
```

Deploys to Vercel as-is (framework preset: Other, no build command, output directory `.`).

## Where things live

| File | What it does |
| --- | --- |
| `src/rooms/*.js` | One file per room. This is where the drawing happens. |
| `src/rooms/index.js` | Which room sits where on the 4x4 block (row A is the back). |
| `src/art.js` | The ink box: palette, halftone dots, people, the goose, furniture, plants. |
| `src/actors.js` | Motion helpers: walking routes, orbits, particles. |
| `src/scene.js` | Turns a room into layers and depth-sorts it. |
| `src/main.js` | Camera, touch and mouse, tour, the room card, hints, found state, the honk. |
| `src/ambient.js` | The blimp, birds, paper plane and print marks around the sheet. |
| `styles.css` | The UI chrome (title, tallies, room card, buttons). |
| `tools/shoot.mjs` | Screenshot a room: `node tools/shoot.mjs laundromat out.png --zoom=2`. |
| `tools/ROOM_BRIEF.md` | The brief for drawing a new room. |

### Common changes

- **Palette:** edit `C` at the top of `src/art.js`. Every room pulls from it.
- **Room names, blurbs and finds:** each room file starts with `id`, `name`, `blurb`; finds are the `R.find(...)` calls.
- **Swap or reorder rooms:** edit the list in `src/rooms/index.js`.
- **Tour pacing:** `stepTour` in `src/main.js` (fly 2.2 s, linger 5.5 s).
- **Sharpness vs. speed:** `dprCap` in `src/main.js` (draws at up to 3x; drops to 2x on its own if a phone struggles). Neighbor-room picture sizes are `SNAP_STEPS` / `SNAP_CAP`.
- **Room card collapse:** `setCollapsed` in `src/main.js`; styles under "Room card" in `styles.css`. Tap the chevron, the room name or the handle, or swipe the card's top row. The choice is remembered per browser.
- **iPhone bars:** `--bleed` in `styles.css` lets the plate run under Safari's status bar and toolbar. The body background (`#ECE2CF`) is the paper-with-grain color Safari falls back to.
- **Opening animation:** `introDrop` in `src/main.js` (rooms drop in by diagonal); title letters in `styles.css` (`@keyframes letter`).
- **Title and tagline:** `index.html`.
- **Back link to the Lab:** the `brand-back` link in `index.html` (styled in `styles.css`). Squares lives at `squares.ryankm.com` and is listed on ryankm.com/lab as EXP-044.
