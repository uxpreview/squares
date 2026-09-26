# Prompt: area artist

The lead sends one of these per area to parallel agents, four to six at once, after the owner approves the greybox (see [PROCESS.md](../PROCESS.md), step 5). Fill in every `{{BLANK}}` from the level's brief; leave the rest as written. Everything below the line is the prompt.

---

You're drawing one area of a level in **Squares**, an animated isometric hidden-object picture book drawn entirely in code on a 2D canvas (think *Where's Waldo* printed on a risograph). The level is **{{LEVEL_NAME}}** (`{{LEVEL_ID}}`). Your area is **{{AREA_NAME}}** (`{{AREA_ID}}`), in `src/maps/{{LEVEL_ID}}/areas/{{AREA_ID}}.js`.

Right now that file is a **greybox**: plain blocks, labels and numbered pins showing where everything goes. The owner has approved that layout. Your job is to replace the greybox with finished art, keeping the layout, and to make the area dense, alive and funny.

## Read first, in this order

1. `docs/levels/{{LEVEL_ID}}.md`: the level's brief (the story, the cast, the palette, what your area is for). It's the source of truth.
2. `tools/ROOM_BRIEF.md`: how a zone is built, the drawing kit, the quality bar for density and life.
3. `src/maps/{{LEVEL_ID}}/style.js`: the level's inks and shared props. Use these; don't invent colors.
4. Your greybox: `src/maps/{{LEVEL_ID}}/areas/{{AREA_ID}}.js`, and the level's plan files ({{PLAN_FILES}}).
5. `src/maps/block/rooms/pool.js`: the reference for density and polish.

## What's fixed

- **Walls and doors.** Keep the `R.walls({...})` call and its `doors`. People walk through those doors on the level's shared clock, so a moved door strands them.
- **The finds.** Keep every find's `id` and label. Replace each numbered pin with the real object at the same spot; you can nudge one by a unit or so if the art needs it (say so in your report). Finds must be visible, never behind anything, 0.3 to 1 unit across, with a tap radius `r` of 0.6 to 1.0.
- **The layout.** The hero and the big furniture stay where the greybox put them, at about the same size, drawn properly.
- **The shared cast.** People on the level's clock ({{WALKERS_FILE}}) are drawn by the engine in whichever room they're in; don't draw them yourself. Extras who stay in your area are yours.
- **The level's hooks.** Keep any shared calls the greybox makes, such as `R.dark(...)` (so your room goes dark with the rest) and the style sheet's lights (`lamp`, `candle`, `fire`) or weather.

## Your area

- **What's happening:** {{WHATS_HAPPENING}}
- **Running gag (plays out over time):** {{RUNNING_GAG}}
- **Finds:** {{FINDS}}
- **Who passes through, and when:** {{WHO_PASSES}}
- **The other areas' gags**, so jokes can cross over: {{OTHER_GAGS}}

## Rules

1. **Only edit your own area file.** Not the engine, the game, the UI, the map, the plan, the style sheet or anyone else's area. If you need a helper, write it inside your file; if it would help other areas, say so in your report (the art director may promote it into the style sheet).
2. Don't run any git commands. Don't create files except scratch screenshots outside the repo.
3. Colors come from `C` (`src/engine/art.js`) or the level's style sheet, never a raw hex code. `npm run qa` fails on raw hex in area files.
4. Everything is a pure function of time `t`. Anything that moves is `{ anim: true }` or a `R.mover`.
5. Copy: the `name` is 1 to 3 words; the `blurb` is one or two short, funny, plain sentences. **No em dashes** anywhere, in copy or comments.
6. Aim for the ROOM_BRIEF density: 10 to 18 people or creatures doing specific, legible, funny things; at least 8 distinct moving things; signs that are jokes; one little story that plays out over time.
7. Stay light: under about 80 particles, no gradients created in loops, heavy static drawing kept out of animated items. QA's speed check will tell you.

## Check your work

Look at your area often, at several moments and on a phone:

```
node tools/shoot.mjs {{LEVEL_ID}}/{{AREA_ID}} out.png --at=20             # desktop, 20 seconds into the loop
node tools/shoot.mjs {{LEVEL_ID}}/{{AREA_ID}} out.png --at={{KEY_MOMENT}}  # {{KEY_MOMENT_WHAT}}
node tools/shoot.mjs {{LEVEL_ID}}/{{AREA_ID}} out.png --mobile --finds     # phone, with every find ringed
node tools/shoot.mjs {{LEVEL_ID}}/{{AREA_ID}} out.png --zoom=2.2           # close up
node tools/shoot.mjs {{LEVEL_ID}} out.png                                    # the whole level, to see how you sit in it
npm run qa -- {{LEVEL_ID}} --quick                                           # the machine checks
```

There must be no console errors from your area, and no `FAIL` lines about it in QA.

## Report

When you're done, reply with:
- The area's name and blurb.
- Each find: where it is now and what it looks like (and anything you moved).
- The running gag, and how it plays out.
- Any helper that other areas could use, and anything in shared code you had to work around.
