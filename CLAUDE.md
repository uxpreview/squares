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
- `node tools/shoot.mjs <target> <out.png> [--mobile] [--zoom=2] [--t=4]` to look at your work. Targets: `title`, `maps`, a map id (`block`), or `map/zone` (`block/pool`). Always look at desktop and `--mobile`.

## Architecture (see README for the file map)

- **Places (maps) are made of zones.** A map file (`src/maps/<id>/map.js`) lists zone modules and where they sit in 3D (`at: [x, y, z]`, zones are 16 x 16), plus its cutaway mode, copy (`words`) and optional `backdrop`/`sky` art. `src/maps/index.js` registers maps with lazy `load()` imports.
- **Layers:** `engine/` (drawing, camera, input; no game rules) → `game/` (rules, saves, sound) → `ui/` (DOM screens). Keep engine code free of game concepts like geese or scores.
- `main.js` owns routing (`#/`, `#/maps`, `#/<map>`, `#/<map>/<zone>`) and the frame loop. `game/play.js` is one controller reused across maps via `load(world)`.
- Zones must draw as pure functions of time `t`. Anything that moves is `anim: true`. See `tools/ROOM_BRIEF.md`.
- Saves: `game/store.js`, versioned. Never change the shape without bumping the version and migrating.

## Conventions

- Match the surrounding code: plain JS, short comments that explain why, no TypeScript, no new dependencies without a good reason.
- UI copy: plain, short, funny where it fits. **No em dashes** anywhere in copy or comments.
- Colors come from `C` in `engine/art.js` (canvas) or the CSS tokens at the top of `styles.css` (DOM). It's one printed sheet: one paper, six inks, no dark mode on purpose.
- Respect `prefers-reduced-motion` (the camera and CSS already do).
- Touch targets at least 40px; everything works at 390px wide and in landscape phones.
