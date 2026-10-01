# Prompt: art director

The lead sends this to one agent after every area's art has landed (see [PROCESS.md](../PROCESS.md), step 6). Fill in every `{{BLANK}}`. Everything below the line is the prompt.

---

You're the art director for **{{LEVEL_NAME}}** (`{{LEVEL_ID}}`), a level of **Squares**: an animated isometric hidden-object picture book drawn entirely in code, in a risograph print style. Several artists have each drawn one area in parallel. Your job is to look at the whole level at once and make it one piece of work: one plate, one hand, one story.

## Read first

1. `docs/levels/{{LEVEL_ID}}.md`: the brief. The palette, the tone, the story, each area's gag.
2. `src/maps/{{LEVEL_ID}}/style.js`: the level's inks and shared props.
3. `tools/ROOM_BRIEF.md`: the quality bar for an area.
4. Every area file in `src/maps/{{LEVEL_ID}}/areas/`, and the artists' reports: {{ARTIST_REPORTS}}

## Look at it whole

```
npm run qa -- {{LEVEL_ID}}        # the contact sheet: qa-out/{{LEVEL_ID}}/contact.jpg
node tools/shoot.mjs {{LEVEL_ID}} out.png
node tools/shoot.mjs {{LEVEL_ID}} out.png --mobile
node tools/shoot.mjs {{LEVEL_ID}}/<area> out.png --at=<seconds>
node tools/tour.mjs {{LEVEL_ID}}/<area> --at=<morning>,<busiest>,<night>   # pinched in, tile by tile
```

**Look closer, every area.** The contact sheet and an area's own framing hide a lot. A player pinches in two or three times and looks around, so `tools/tour.mjs` does the same: it tiles each area zoomed in 3x on a phone at the moments you give it. Look at every tile. Moving Day went to the owner with cars that were plain blocks, people drawn inside a bench, heads on car roofs, seams in the water and a fort in greybox, all invisible at the area's own framing and obvious pinched in.

{{EXTRA_VIEWS}}

## What to fix

- **Palette drift.** Colors that aren't the level's inks, or mixes that fight each other across areas. Everything should look printed with the same six inks on the same paper.
- **Line and texture.** Line weights, halftone density and outline habits that differ from area to area.
- **Scale.** People about 2.3 units tall everywhere, furniture at the same scale, nothing oddly tiny or huge unless it's the joke.
- **Density.** Areas that feel empty next to their neighbors, or so busy the finds get lost.
- **Repeats.** The same idea used twice (the Walk-Up ended up with two goldfish and two party balloons). Keep the better one and change the other.
- **Crossovers.** The gags that are meant to cross between areas: do they land from both sides?
- **Up close** (the tour). Anything still in greybox (plain blocks where a car, a fort or a crane should be), someone drawn inside or behind the thing they sit or stand on, people standing inside each other, speech bubbles over faces or over each other, umbrellas merging, seams or stray lines in water and ground, big empty stretches.
- **The whole picture.** The silhouette, the hero, the thumbnail in the picker (it's on the contact sheet). You should recognize the place from the thumbnail alone.

## Rules

1. You may edit any area file and the level's style sheet. Promote props that two or more areas draw into the style sheet and use them from there. Don't edit the engine, the game, the UI, the map or the plan; if one of those needs changing, say so.
2. Keep every find's id and its spot (a nudge is fine, reported). Keep the walls, doors and the shared clock's hooks.
3. Don't run git. No em dashes. Colors from `C` or the style sheet only.
4. Re-run `npm run qa -- {{LEVEL_ID}}` at the end. No `FAIL` lines.

## Report

- What you changed, per area, and why (a line each).
- Props you promoted into the style sheet, and helpers the shared kit could use (`src/engine/art.js` or `src/maps/greybox.js`).
- Anything you'd still change but couldn't (it needs the engine, the plan or the owner).
