# How we make a level

Levels get added often, so making one has to be a repeatable pipeline, not a fresh adventure each time. This is that pipeline. The goal: every level ships at the same quality bar, the owner spends time only on the decisions that need taste, and each level makes the next one cheaper.

## Principles

1. **Decide on paper before pixels.** A brief and a greybox cost minutes to change. Finished art costs hours. The owner's approval comes at the cheap moments.
2. **One source of truth per level.** Its brief (`docs/levels/<id>.md`). Every agent that touches the level reads it first; every decision made later goes back into it.
3. **Parallel where the work is independent, one voice where it needs judgment.** Areas are drawn in parallel by separate agents. Consistency, the story and the finds get one reviewer each.
4. **Machines check what machines can check.** Errors, performance, finds being on screen and tappable, copy rules: automated, every time. People (and a fresh-eyes playtest agent) check whether it's fun.
5. **Every level leaves the kit better.** Helpers an area artist had to write for themselves get promoted into the shared kit, so the next level starts with them.

## Who does what

| Role | Who | Does |
| --- | --- | --- |
| **Owner** | You | Picks the level. Approves at three gates: brief, greybox, preview. About 15 minutes each. |
| **Lead** | The main Claude session | Writes the brief, builds any engine pieces, scaffolds and greyboxes, briefs and coordinates the agents, runs QA, fixes, ships. |
| **Area artists** | Parallel agents, one per area | Draw one area each from the brief, the level's style sheet and `tools/ROOM_BRIEF.md`. Check their own work with screenshots. |
| **Art director** | One agent, after the areas land | Looks at the whole level at once: palette drift, scale, density, repeated jokes, whether the areas' stories connect. Fixes what's off. |
| **Playtester** | One fresh agent that hasn't seen the code | Plays from screenshots only: tries to find each thing from its label, reports what took too long, what was impossible, what was confusing. |

## The pipeline

### 1. Pick
From [LEVELS.md](LEVELS.md). The owner chooses.

### 2. Brief (gate 1: the owner approves)
The lead writes `docs/levels/<id>.md` from [the template](levels/_TEMPLATE.md): the story and its solution, the shape, the areas and each one's running gag, the cast, the palette, what keeps it alive, the finds, the shared-universe cameos, and the engine pieces it needs. The owner reads it and says yes, or what to change.

### 3. Engine prep
Anything the level needs that the engine can't do yet gets built first, in its own commits, with the smoke test extended to cover it. Engine work never waits on art, and art never works around missing engine pieces.

### 4. Scaffold and greybox (gate 2: the owner approves)
- `npm run new-level -- <id>` makes the level's folder, map file, style sheet (the brief's inks), backdrop and sky, and a placeholder file per area (from the brief's Areas table), all in one step, and lists the level (hidden until it ships).
- The greybox: every area blocked out in plain shapes with the greybox kit (`src/maps/greybox.js`): floors, walls and doors, the hero, furniture, paths, where people stand, the finds as numbered pins, the camera framing tuned. If people move between areas, their evening goes in the level's timeline (see `src/maps/manor/evening.js`).
- `npm run qa -- <id>` must pass. Its contact sheet (every floor, key moments, every area on desktop and phone) and a preview link go to the owner.
- This is the moment to change the layout, the composition or the shape. After this gate, the layout is fixed.

### 5. Area art (parallel)
One agent per area, four to six at once, each sent [prompts/area-artist.md](prompts/area-artist.md) filled in from the brief: the brief, the style sheet, its own area's section and the list of the other areas' gags so jokes can cross over. Each checks its own area at several moments, on desktop and phone.

### 6. Art direction pass
One agent, sent [prompts/art-director.md](prompts/art-director.md), looks at the whole level (the contact sheet first) and fixes consistency: palette, line weight, scale, density, duplicated ideas (the Walk-Up ended up with two goldfish and two party balloons), and whether cross-area gags land.

### 7. QA (repeat until clean)
**Automated:** `npm run qa -- <id>` (about three minutes; `--quick` for about one):
- No errors loading the level, or drawing any area (walls up and down) at 48 moments across its loop.
- People on the level's clock go through doors, never walls, never faster than a run.
- Performance: every view holds its frame budget with the CPU slowed 4x (a mid-range phone). The budget is set by The Block.
- Every find is on screen when its area is framed on a phone and a desktop, clear of the find list and buttons, not crowding another find, and a real tap finds it. (Whether it's hidden behind something, or its tap area has drifted off its art, is for eyes: the contact sheet rings every find, and the playtest scores taps against the art.)
- Find labels are unique across the level and follow the style (sentence case, "A lost mitten").
- Copy rules: no em dashes, names 1 to 3 words, blurbs one or two sentences, no placeholders left. Colors come from `C` or the style sheet.
- A contact sheet for eyeballing, and a report, in `qa-out/<id>/`.

**Playtest:** a fresh agent sent [prompts/playtester.md](prompts/playtester.md) plays from screenshots only (`node tools/playtest.mjs <id> prepare`), guesses where each find is, and scores itself (`check`). Every find should take between 20 and 90 seconds for a fresh player. Too easy or impossible gets moved or relabeled.

### 8. Preview (gate 3: the owner approves)
The pull request's Vercel preview, with a short checklist of what to look at. The owner plays it on their phone. Feedback goes in the PR or the chat; the lead fixes and re-runs QA.

### 9. Ship
Merge. Update the roadmap (what shipped, what was learned), move the level's status in LEVELS.md, and note which helpers were promoted into the kit.

## The quality bar

A level is done when all of these are true:

- **Look:** you'd recognize it from its thumbnail alone. It has its own palette and silhouette. Nothing looks unfinished at any zoom.
- **Life:** nothing in view is still for long. Every area has people doing specific things, at least one loop that plays out as a little story, and ambient motion (weather, light, particles).
- **Laughs:** every area has a joke you get without reading the blurb. Signs are jokes. At least one gag crosses between areas.
- **Story:** the level's mystery or event makes sense, and the finds help you piece it together.
- **Finds:** fair (20 to 90 seconds each), unambiguous labels, never hidden behind anything, tappable on a phone.
- **Feel:** smooth on a mid-range phone, works at 390px wide and in landscape, no errors.
- **Words:** plain, funny where it fits, no em dashes.
- **Universe:** the goose, and at least one recurring character or brand.

## Making it cheaper every time

- **The kit.** Shared drawing helpers live in `src/engine/art.js` today; as levels add furniture, architecture, nature and characters that others could use, they move into a shared kit. The art director flags candidates; the lead promotes them.
- **Style sheets.** Each level has one file (`src/maps/<id>/style.js`) with its palette and its recurring props, imported by every area, so consistency is built in rather than policed.
- **The greybox kit** (`src/maps/greybox.js`): blocks, labels, pins, stairs, walker paths. Every level's layout starts there.
- **Casts.** People today; animals and others as levels need them. Built once, reused everywhere.
- **Templates.** The brief template ([levels/_TEMPLATE.md](levels/_TEMPLATE.md)) and the prompts for the area artists, the art director and the playtester ([prompts/](prompts/)) live in the repo so every level starts from the same place.
- **Formats.** Some level ideas share a structure (a whodunit, an escape, a before-and-after). Build the format once with its first level; later levels reuse it.
