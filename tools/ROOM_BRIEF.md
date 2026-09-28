# Squares: brief for drawing a zone

Squares is an animated isometric hidden-object picture book (a "wimmelbild", like r/wimmelbilder or Where's Waldo, drawn in a risograph / halftone print style). The game is made of **places** (maps), and each place is made of **zones**: a room on The Block, a floor of The Walk-Up. You zoom into a zone, and there are tiny people doing funny things everywhere. Every zone hides a loose goose plus three objects the player taps to circle with a pen.

Everything is drawn in code on a canvas. Nothing is static: every zone should be crawling with life.

## Where things live

- A zone is one file: `src/maps/<map>/areas/<id>.js` for levels made with `npm run new-level` (the Manor), `src/maps/<map>/rooms/<id>.js` (The Block) or `src/maps/<map>/floors/<id>.js` (The Walk-Up).
- A level made with the pipeline has a style sheet, `src/maps/<map>/style.js`: its inks and shared props. Use it.
- Imports from a zone file: `'../../../engine/art.js'`, `'../../../engine/actors.js'`, `'../../../engine/iso.js'`.
- Which zones a map has, and where they sit, is in that map's `map.js`.

## Read these first

- `src/engine/art.js`: palette `C`, primitives (`box`, `rect`, `disc`, `cylinder`, `face`, `poly`, `paint`, `onLeft`, `onRight`, `windowL/R`, `walls`, `slab`, `floor`, `tiles`, `checker`, `planks`, `rug`, `table`, `chair`, `shelfL/R`, `lamp`, `plant`, `tree`, `frame`, `clockL`, `note`, `paintText`, `label`, `speech`), people (`person`, `folk`) and the `goose`.
- `src/engine/actors.js`: `route` (walk a path, with pauses and ping-pong), `orbit`, `particles` (stateless particle systems), `pulse`, `wave`, `ease`, `clamp`.
- `src/engine/zone.js`: the zone builder `R` and how layers and depth sorting work.
- `src/maps/block/rooms/pool.js`: the reference zone. Match or beat its density and polish.

## The rules

1. **Only edit your own zone files** (listed in your task). Do not edit anything in `src/engine/`, `src/game/`, `src/ui/`, any `map.js` or `ambient.js`, `index.html`, `styles.css`, or anyone else's zone. If you need a helper, write it locally inside your zone file. If you find a bug in shared code, work around it and mention it in your final report.
2. Do not run any git commands. Do not create other files except scratch screenshots outside the repo.
3. A zone module exports `{ id, name, blurb, build(R) }`. Keep the `id` you were given. `name` is 1 to 3 words. `blurb` is one or two short, funny, plain sentences about what is going on. **No em dashes anywhere** in copy.
4. Use colors from `C` or the level's style sheet only (plus mixes via `shade`, `tint`, `mix`, `alpha`); never a raw hex code. Use halftone `dots` on shadowed faces and big surfaces like the reference. Outline with the default ink stroke.

## Geometry

- Zone floor is 16 x 16 units: x runs to the screen's lower-right, y to the lower-left, z is up. The back walls are the planes x = 0 (left wall, draw on it with `onLeft(ctx, y, z, w, h, ...)`) and y = 0 (right wall, `onRight(ctx, x, z, w, h, ...)`). The open front corner is (16, 16).
- Default wall height is 6 (`walls(ctx, { h, left, right, cap, dotsL, dotsR, leftWall, rightWall })`). Outdoor zones can use low walls, fences, or no walls. Always draw `slab(ctx, color)` first.
- A person is about 2.3 units tall. The goose is about 1 unit tall. Keep scale consistent: a table top is at z 1.2, a chair seat at 0.8, a door is about 3.2 tall.
- Tall things may rise up to about 9 units above the floor on The Block. On The Walk-Up keep everything under about 8 (the floor above hangs over you in the overview).
- Zones in front of (or above) the one being viewed get cut away automatically, so the whole zone is visible when zoomed in.
- **A zone of another size or shape** (a street, a square): give the zone module `size: [w, d]`, or `shape: [[x0, y0, x1, y1], ...]` for one that isn't one box (an L, a cross). `R.W` and `R.D` are its size, `R.shape` its boxes; `slab(ctx, color, R.W, R.D)`, or `ground(R, ...)` from the greybox kit for a shape. The engine draws it in 16 x 16 chunks, each sorted in with the zones around it, and hides the seams (every 16 units from its back corner). Two rules: keep anything wide and tall about a unit clear of a seam (its sides could be clipped by the chunk beside it), and keep flat things (floor, rug and wall layers) on the zone's own floor, since past its edges they're cut off. `#/crossroads` is the test map.

## Layers and depth

- `R.floor` then `R.wall` then `R.decor` (on the walls) then `R.rug` (flat on the floor, water, shadows) then `R.thing` (standing things, depth sorted by x + y) then `R.air` (over everything: rain, snow, beams).
- `R.thing(x, y, draw)`: pass the footprint center (or front-most point) as x, y. Large objects that people walk around may need splitting into separate things so sorting works.
- `R.mover(posFn, draw, { bias })` for anything that moves. `posFn(t)` returns `{ x, y, ... }`. Use `route`/`orbit`/custom math. Everything must be a pure function of time `t` in seconds (no per-frame state).
- Mark static-looking items that still animate with `{ anim: true }` (e.g. swaying plants, blinking lights, a lamp that flickers). Items without `anim` are drawn once at `t = 0` and cached (in the room you're in, each standing thing gets its own little picture, stamped back between the people walking around it), so anything that changes at all over time MUST be `anim: true` (movers and air are always animated). QA fails a still item that changes.
- Still things are cheap, moving ones cost every frame: split a big piece of furniture from the small thing on it that moves, rather than marking the whole lot `anim`.
- Respect `Q.detail`: skip tiny details and particles when `!Q.detail` (zoomed far out).

## Houses: walls, lights and people passing through

Some levels are houses (the Manor). Their zones use a few more builder calls:

- `R.walls({ left, right, h, doors })` draws the back walls for you, so the engine can drop inside walls to waist height when you're not in the room. Keep the `doors` the greybox gave you (they come from the level's `plan.js`). Anything you paint on a wall goes in `R.wall` or `R.decor`, and is cut down with it.
- `R.light({ at, r, color, k(t), draw })` is a glow (a lamp, a candle, a fire) that still shines when the room goes dark. The style sheet has `lamp`, `candle` and `fire` ready made.
- `R.dark(fn)` darkens the whole room: `fn(t)` from 0 (lit) to 1. Keep the one the greybox has, so your room's lights go out with the rest.
- People on the level's shared clock (its `walkers`) are drawn by the engine in whichever room they're standing in. Don't draw them; you'll see them walk through your doors.

## Finds and the goose

- Exactly three `R.find({ id, label, at: [x, y, z] or (t) => [x, y, z], r })`. The label is how it appears in the checklist, sentence case with an article: "A lost mitten". Objects should be small (0.3 to 1 unit) but clearly visible and not hidden behind anything when the zone is viewed. `at` is the visual center of the object (z included). `r` is the tap radius in units (0.6 to 1.0). Moving finds are great.
- Exactly one `R.goose(pos, opts)`. `pos` is `[x, y, z]` or a function returning `{ x, y, z, dir, pose, moving }` (poses: walk, stand, honk, swim, sit, peck). Give the goose a funny role in the scene. It should be findable but not the first thing you see.

## Density and life (this is the important part)

- Aim for 10 to 18 people doing specific, legible, funny things (not just standing). Use varied `folk(seed, {...})` styles, poses, hats, scales (kids around 0.7).
- At least 8 distinct animated things: people walking routes, machines, particles (steam, bubbles, sparks, snow), blinking lights, swinging, bouncing, spinning.
- Lots of props and clutter: shelves stocked with little items, signs with text (`paintText` on walls, `label`), posters (`frame`), plants, rugs, tables.
- At least one running gag or little story that plays out over time (like the pool's diver who walks out, bounces, dives, swims to the ladder and climbs out).
- Stay performant: keep particle counts under about 80 per zone, avoid creating gradients inside loops, and keep heavy static drawing out of anim items.

## Check your work

Take screenshots and look at them. Iterate until the zone is dense, readable and funny.

```
node tools/shoot.mjs <map>/<zoneId> <scratch>/<zoneId>.png                 # desktop, zoomed to the zone
node tools/shoot.mjs <map>/<zoneId> <out.png> --zoom=2.2 --t=4             # closer, at a later moment
node tools/shoot.mjs <map>/<zoneId> <out.png> --mobile                     # phone
node tools/shoot.mjs <map> <out.png>                                        # the whole place
```

For example `node tools/shoot.mjs block/pool out.png` or `node tools/shoot.mjs tower/lobby out.png`. The script prints console errors. There must be none from your zone (a Google Fonts error is expected in a sandbox without internet and is fine). Check several `--t` values so moving things look right at different moments. Also make sure the three finds and the goose are visible and sensible.

When done, report: the zone names and blurbs, the finds, where the goose is, and anything in shared code you had to work around.
