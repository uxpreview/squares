# Squares: brief for drawing a room

Squares is an animated isometric hidden-object picture book (a "wimmelbild", like r/wimmelbilder or Where's Waldo, drawn in a risograph / halftone print style). Sixteen rooms sit on a 4x4 block. You zoom into a room, and there are tiny people doing funny things everywhere. In every room there's a loose goose to find, plus three hidden objects the viewer taps to circle with a pen.

Everything is drawn in code on a canvas. Nothing is static: every room should be crawling with life.

## Read these first

- `src/art.js`: palette `C`, primitives (`box`, `rect`, `disc`, `cylinder`, `face`, `poly`, `paint`, `onLeft`, `onRight`, `windowL/R`, `walls`, `slab`, `floor`, `tiles`, `checker`, `planks`, `rug`, `table`, `chair`, `shelfL/R`, `lamp`, `plant`, `tree`, `frame`, `clockL`, `note`, `paintText`, `label`, `speech`), people (`person`, `folk`) and the `goose`.
- `src/actors.js`: `route` (walk a path, with pauses and ping-pong), `orbit`, `particles` (stateless particle systems), `pulse`, `wave`, `ease`, `clamp`.
- `src/scene.js`: the room builder `R` and how layers and depth sorting work.
- `src/rooms/pool.js`: the reference room. Match or beat its density and polish.

## The rules

1. **Only edit your own room files** (listed in your task). Do not edit `art.js`, `actors.js`, `scene.js`, `iso.js`, `main.js`, `ambient.js`, `index.html`, `styles.css`, `rooms/index.js`, or anyone else's room. If you need a helper, write it locally inside your room file. If you find a bug in shared code, work around it and mention it in your final report.
2. Do not run any git commands. Do not create other files except scratch screenshots outside the repo.
3. A room module exports `{ id, name, blurb, build(R) }`. Keep the `id` you were given. `name` is 1 to 3 words. `blurb` is one or two short, funny, plain sentences about what is going on. **No em dashes anywhere** in copy.
4. Use colors from `C` only (a six-ink riso palette plus mixes via `shade`, `tint`, `mix`, `alpha`). Use halftone `dots` on shadowed faces and big surfaces like the reference. Outline with the default ink stroke.

## Geometry

- Room floor is 16 x 16 units: x runs to the screen's lower-right, y to the lower-left, z is up. The back walls are the planes x = 0 (left wall, draw on it with `onLeft(ctx, y, z, w, h, ...)`) and y = 0 (right wall, `onRight(ctx, x, z, w, h, ...)`). The open front corner is (16, 16).
- Default wall height is 6 (`walls(ctx, { h, left, right, cap, dotsL, dotsR, leftWall, rightWall })`). Outdoor rooms can use low walls, fences, or no walls. Always draw `slab(ctx, color)` first.
- A person is about 2.3 units tall. The goose is about 1 unit tall. Keep scale consistent: a table top is at z 1.2, a chair seat at 0.8, a door is about 3.2 tall.
- Tall things may rise up to about 9 units above the floor.
- Rooms in front of the one being viewed get cut away automatically, so the whole room is visible when zoomed in.

## Layers and depth

- `R.floor` then `R.wall` then `R.decor` (on the walls) then `R.rug` (flat on the floor, water, shadows) then `R.thing` (standing things, depth sorted by x + y) then `R.air` (over everything: rain, snow, beams).
- `R.thing(x, y, draw)`: pass the footprint center (or front-most point) as x, y. Large objects that people walk around may need splitting into separate things so sorting works.
- `R.mover(posFn, draw, { bias })` for anything that moves. `posFn(t)` returns `{ x, y, ... }`. Use `route`/`orbit`/custom math. Everything must be a pure function of time `t` in seconds (no per-frame state).
- Mark static-looking items that still animate with `{ anim: true }` (e.g. swaying plants, blinking lights). Items without `anim` are baked into a bitmap for the zoomed-out view and drawn at `t = 0`, so anything that moves MUST be `anim: true` (movers and air are always animated).
- Respect `Q.detail`: skip tiny details and particles when `!Q.detail` (zoomed far out).

## Finds and the goose

- Exactly three `R.find({ id, label, at: [x, y, z] or (t) => [x, y, z], r })`. The label is how it appears in the checklist, sentence case with an article: "A lost mitten". Objects should be small (0.3 to 1 unit) but clearly visible and not hidden behind anything when the room is viewed. `at` is the visual center of the object (z included). `r` is the tap radius in units (0.6 to 1.0). Moving finds are great.
- Exactly one `R.goose(pos, opts)`. `pos` is `[x, y, z]` or a function returning `{ x, y, z, dir, pose, moving }` (poses: walk, stand, honk, swim, sit, peck). Give the goose a funny role in the scene. It should be findable but not the first thing you see.

## Density and life (this is the important part)

- Aim for 10 to 18 people doing specific, legible, funny things (not just standing). Use varied `folk(seed, {...})` styles, poses, hats, scales (kids around 0.7).
- At least 8 distinct animated things: people walking routes, machines, particles (steam, bubbles, sparks, snow), blinking lights, swinging, bouncing, spinning.
- Lots of props and clutter: shelves stocked with little items, signs with text (`paintText` on walls, `label`), posters (`frame`), plants, rugs, tables.
- At least one running gag or little story that plays out over time (like the pool's diver who walks out, bounces, dives, swims to the ladder and climbs out).
- Stay performant: keep particle counts under about 80 per room, avoid creating gradients inside loops, and keep heavy static drawing out of anim items.

## Check your work

Take screenshots and look at them. Iterate until the room is dense, readable and funny.

```
node tools/shoot.mjs <roomId> /tmp/claude-0/-home-user-squares/caa7d277-a828-5ac5-804c-c8d3a8f31478/scratchpad/<roomId>.png          # desktop, zoomed to the room
node tools/shoot.mjs <roomId> <out.png> --zoom=2.2 --t=4   # zoom in closer, capture a later moment
node tools/shoot.mjs <roomId> <out.png> --mobile           # phone
node tools/shoot.mjs overview <out.png>                    # whole block
```

The script prints console errors. There must be none from your room (a Google Fonts certificate error is expected in this sandbox and fine). Check several `--t` values so moving things look right at different moments. Also make sure the three finds and the goose are visible and sensible.

When done, report: the room names and blurbs, the finds, where the goose is, and anything in shared code you had to work around.
