# How we make a level

Levels get added often, so making one has to be a repeatable pipeline, not a fresh adventure each time. This is that pipeline. The goal: every level ships at the same quality bar, the owner spends time only on the decisions that need taste, and each level makes the next one cheaper.

## Principles

1. **Decide on paper before pixels.** A brief and a greybox cost minutes to change. Finished art costs hours. Decisions get made at the cheap moments and written into the brief, where the owner sees them all at the preview.
2. **One source of truth per level.** Its brief (`docs/levels/<id>.md`). Every agent that touches the level reads it first; every decision made later goes back into it.
3. **Parallel where the work is independent, one voice where it needs judgment.** Areas are drawn in parallel by separate agents. Consistency, the story and the finds get one reviewer each.
4. **Machines check what machines can check.** Errors, performance, finds being on screen and tappable, copy rules: automated, every time. People (and a fresh-eyes playtest agent) check whether it's fun.
5. **Every level leaves the kit better.** Helpers an area artist had to write for themselves get promoted into the shared kit, so the next level starts with them.

## Who does what

| Role | Who | Does |
| --- | --- | --- |
| **Owner** | You | Picks the level. Reviews once, at the preview (gate 3), before it's listed. At gates 1 and 2 the lead takes its own recommendations and records them (the owner's choice, Sept 2026); the owner can overturn any of them at the preview. |
| **Lead** | The main Claude session | Writes the brief, builds any engine pieces, scaffolds and greyboxes, briefs and coordinates the agents, runs QA, fixes, ships. |
| **Area artists** | Parallel agents, one per area | Draw one area each from the brief, the level's style sheet and `tools/ROOM_BRIEF.md`. Check their own work with screenshots. |
| **Art director** | One agent, after the areas land | Looks at the whole level at once: palette drift, scale, density, repeated jokes, whether the areas' stories connect. Fixes what's off. |
| **Playtester** | One fresh agent that hasn't seen the code | Plays from screenshots only: tries to find each thing from its label, reports what took too long, what was impossible, what was confusing. |

## The pipeline

### 1. Pick
From [LEVELS.md](LEVELS.md). The owner chooses.

### 2. Brief (gate 1: the lead's call)
The lead writes `docs/levels/<id>.md` from [the template](levels/_TEMPLATE.md): the story and its solution, the shape, the areas and each one's running gag, the cast, the palette, what keeps it alive, the finds, the shared-universe cameos, and the engine pieces it needs. Each open question gets a recommendation; the lead takes it and writes it into the brief's Decisions as the lead's call. Still ask the owner when a choice can't be undone cheaply later and there's no clear recommendation.

### 3. Engine prep
Anything the level needs that the engine can't do yet gets built first, in its own commits, with the smoke test extended to cover it. Engine work never waits on art, and art never works around missing engine pieces.

### 4. Scaffold and greybox (gate 2: the lead's call)
- `npm run new-level -- <id>` makes the level's folder, map file, style sheet (the brief's inks), backdrop and sky, and a placeholder file per area (from the brief's Areas table), all in one step, and lists the level (hidden until it ships).
- The greybox: every area blocked out in plain shapes with the greybox kit (`src/maps/greybox.js`): floors, walls and doors, the hero, furniture, paths, where people stand, the finds as numbered pins, the camera framing tuned. If people move between areas, their evening goes in the level's timeline (see `src/maps/manor/evening.js`).
- A place with ground and water (a coast, a hill, a river) starts from its land instead of floors: one `land.js` with its heights, the layers printed on them and the water's level through the loop (see `src/maps/plum/land.js` and `src/engine/terrain.js`). Its areas print their part of it. QA fails ground too steep to draw ground-first.
- `npm run qa -- <id>` must pass. The lead checks its contact sheet (every floor, key moments, every area on desktop and phone) against the brief and records any change in the brief's Decisions.
- This is the moment to change the layout, the composition or the shape. After this gate, the layout is fixed.

### 5. Area art (parallel)
One agent per area, four to six at once, each sent [prompts/area-artist.md](prompts/area-artist.md) filled in from the brief: the brief, the style sheet, its own area's section and the list of the other areas' gags so jokes can cross over. Each checks its own area at several moments, on desktop and phone.

### 6. Art direction pass
One agent, sent [prompts/art-director.md](prompts/art-director.md), looks at the whole level (the contact sheet first) and fixes consistency: palette, line weight, scale, density, duplicated ideas (the Walk-Up ended up with two goldfish and two party balloons), and whether cross-area gags land.

**Look closer.** Then every area pinched in, the way a player looks: `node tools/tour.mjs <id>/<area> --at=<moments>` tiles it 3x zoomed on a phone. Outdoors, tour the whole day (dawn, morning, the busy hour, any weather, dusk, night: Moving Day's dusk had a see-through house the other moments didn't show). The art director looks at every tile, and the lead looks again before gate 3. The owner's review is for taste; finding broken drawing is ours. (Moving Day reached the owner with greybox cars, people inside a bench, heads on car roofs and seams in the harbor, all invisible at the areas' own framing.)

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
Before it goes to the owner, the lead has toured every area pinched in (step 6) and fixed what it found. The owner's one review. The pull request's Vercel preview, with a short checklist of what to look at, the lead's calls from gates 1 and 2 (in the brief's Decisions) so any can be overturned, and any questions still open, each with a recommendation. Speed is settled on the owner's 2017 laptop (`npm run qa`, `node tools/fps.mjs`), not in the cloud. The owner plays it on their phone. Feedback goes in the PR or the chat; the lead fixes and re-runs QA.

### 9. Ship
Merge. Update the roadmap (what shipped, what was learned), move the level's status in LEVELS.md, and note which helpers were promoted into the kit.

## One thing per session

One level at a time, and one step of it per session (the owner's call, Oct 2026). Moving Day and All You Can Eat were built side by side, each from brief to finished art in one pull request; both took too long and both reached gate 3 needing more work. Now:

- **A session is one pull request with one goal,** sized to finish: the brief and greybox; the art and the art direction (with the tour); QA, the playtest and gate 3; the owner's notes and ship. Engine work a level needs goes first, in the same session or one before.
- **A session stops at a gate.** Gate 3 goes to the owner from a session whose only job was getting it there.
- **The next level starts when the last one ships.**

### If two levels ever run at once again

Two levels can be built at the same time, each in its own session (the owner opens them), on its own branch, with its own PR. Not more than two: the lead of each already runs its artists in parallel, and the owner's laptop is where speed gets settled.

- **Stagger them.** Best is one level in its brief or greybox (mostly writing) while the other is in art and QA (heavy on the computer).
- **Measuring takes turns.** Only one session at a time runs `npm run qa`, `node tools/fps.mjs`, `node tools/speed.mjs` or `node tools/playtest.mjs` on the owner's laptop: two at once make each other's numbers noisy and QA's tap checks flaky. Writing, greyboxing and art can overlap freely. Before a long run, check nothing else is running (`pgrep -fl "tools/(qa|fps|speed|playtest)"`) and wait if something is.
- **Engine changes take turns.** Only one of the two changes `src/engine/`, `src/game/`, `src/ui/` or the shared tools at a time; it merges first, and the other brings `main` in before it builds on them. The other level keeps to its own folder (`src/maps/<id>/`), its brief, and its own lines in `src/maps/index.js` and the smoke test.
- **Shared files are merged, not overwritten.** The roadmap, README, `src/maps/index.js` and `tools/smoke.mjs` get edits from both. Each session adds its own lines and brings `main` in before its final checks, so conflicts are small and caught early.
- **Levels that reuse the same code** (the Block Party's streets, the water): the first to change a shared piece does it in its own commits and says so in the roadmap.

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
