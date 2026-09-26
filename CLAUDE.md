# Squares: notes for AI agents

An isometric hidden-object game drawn entirely on a 2D canvas. Vanilla JS modules, built with Vite. No frameworks, no runtime dependencies (fonts are the only npm packages that ship).

The owner is a designer who vibe codes. Explain changes in plain language, say where to change things, and don't hand them a stack trace to debug.

## Plans

- `docs/ROADMAP.md`: what's being built and in what order, one PR per session. Read it at the start of a session; update it at the end (tick what shipped, record decisions).
- `docs/PROCESS.md`: how a level gets made (brief, greybox, parallel area art, art direction, QA, preview), who does what, and the quality bar. Follow it for every new level.
- `docs/levels/<id>.md`: each level's brief, the single source of truth for that level. Read it before touching the level; write decisions back into it.
- `docs/LEVELS.md`: the level backlog, with a pitch per idea and what engine pieces each needs.
- `docs/INSPIRATION.md`: the owner's reference images, described (the images aren't stored), and what each teaches. Every new place starts from here.

## Commands

- `npm run dev` to play locally.
- `npm run build` must pass before you push.
- `npm run smoke` clicks through title, picker, play, finding, finishing, old save migration and deep links. Run it after touching `src/engine/`, `src/game/`, `src/ui/`, `src/main.js`, `index.html` or `styles.css`. Add a check when you add a flow.
- `node tools/shoot.mjs <target> <out.png> [--mobile] [--landscape] [--zoom=2] [--t=4] [--at=90] [--storey=up] [--finds]` to look at your work. Targets: `title`, `maps`, a map id (`block`), or `map/zone` (`block/pool`). `--at` shows a moment of the scene (seconds), `--storey` a floor, `--finds` rings every find. Always look at desktop and `--mobile`.
- `npm run new-level -- <id>` scaffolds a new place from its brief (`docs/levels/<id>.md`).
- `npm run qa -- <id>` runs every machine check on a place and makes its contact sheet in `qa-out/<id>/` (ignored by git). It must pass before a level goes to the owner. `--quick` skips the slow parts.
- `node tools/playtest.mjs <id> prepare|check` runs a blind playtest from screenshots (see `docs/prompts/playtester.md`).

## Architecture (see README for the file map)

- **Places (maps) are made of zones.** A map file (`src/maps/<id>/map.js`) lists zone modules and where they sit in 3D (`at: [x, y, z]`, zones are 16 x 16), plus its cutaway mode, copy (`words`) and optional `backdrop`/`sky` art. `src/maps/index.js` registers maps with lazy `load()` imports.
- **Houses:** a map can name `storeys` (a floor switch shows one at a time), drop inside walls to waist height (`cutaway.walls`; zones draw their walls with `R.walls` so the engine can cut them), and run `walkers`: people on one clock who walk room to room through doors, drawn by whichever zone they're in (`schedule()` in `engine/actors.js`). Rooms can go dark (`R.dark`) and light up (`R.light`). The Manor uses all of it.
- **Each new level has a style sheet** (`src/maps/<id>/style.js`): its inks, shared props, and shared state like the storm.
- **Layers:** `engine/` (drawing, camera, input; no game rules) → `game/` (rules, saves, sound) → `ui/` (DOM screens). Keep engine code free of game concepts like geese or scores.
- `main.js` owns routing (`#/`, `#/maps`, `#/<map>`, `#/<map>/<zone>`) and the frame loop. `game/play.js` is one controller reused across maps via `load(world)`.
- Zones must draw as pure functions of time `t`. Anything that moves is `anim: true`. See `tools/ROOM_BRIEF.md`.
- Saves: `game/store.js`, versioned. Never change the shape without bumping the version and migrating.

## Conventions

- Match the surrounding code: plain JS, short comments that explain why, no TypeScript, no new dependencies without a good reason.
- UI copy: plain, short, funny where it fits. **No em dashes** anywhere in copy or comments.
- Colors come from `C` in `engine/art.js` or the level's style sheet (canvas), or the CSS tokens at the top of `styles.css` (DOM). Each place is one printed plate: its own paper and inks (a night is printed in dark ink, it isn't a dark mode). QA fails raw hex colors in area files.
- Respect `prefers-reduced-motion` (the camera and CSS already do).
- Touch targets at least 40px; everything works at 390px wide and in landscape phones.
