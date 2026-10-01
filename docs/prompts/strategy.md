# Prompt: the strategy session

The owner pastes this into a fresh session on their own computer, after PR #30 is merged. Everything below the line is the prompt.

---

This is a strategy session for **Squares**, not a build session. No game code changes. The output is a strategy the owner signs off on, a rewritten roadmap, and the first session after this one ready to start.

## Where things are

Five places are live: the Block Party, Gooseworth Manor (a whodunit), Plum Island, Moving Day and All-You-Can-Eat (also a whodunit). The pipeline (brief, greybox, area artists in parallel, art direction, QA, pinched-in tour, playtest, gate 3) works and is documented. The next level on the roadmap was The Block, But Wrong. **The owner has dropped it:** it doesn't appeal to them.

The owner's worries, in their words:
- The same repetitive tasks will get boring: every level is the same loop.
- The mystery format should belong to the Manor, and the Manor alone. (All-You-Can-Eat reused it.)
- Everything is really easy to find.
- Maybe stop adding places, make the five we have great, and do a full round for a v2 of the game.
- The name. "Squares" is a working title. Naming research is already done (`docs/NAMING.md`, Sept 2026): it recommends **Goose at Large**, with Goose of Interest as the best new name, and **Geraldine** for the goose. Nothing has been renamed yet.
- The goal: a real game that gets popular and wins an Awwwards Site of the Day.

## Before you form a view

1. Read `CLAUDE.md`, `docs/ROADMAP.md` (the bar, the plans, every decision), `docs/PROCESS.md`, `docs/LEVELS.md`, `docs/INSPIRATION.md`, `docs/NAMING.md`, and each level's brief in `docs/levels/`, especially the playtest results and the owner's reviews.
2. Play every place. `npm install`, `npx playwright install chromium`, then `npm run dev` and open it. Use `node tools/shoot.mjs` and `node tools/tour.mjs` to look closely, on a phone (`--mobile`) and a desktop. Time yourself finding things. Note where it's fun and where it's a chore.
3. Look at the evidence on difficulty. Blind playtests found 25 of 29 on the ship and 46 of 48 on Moving Day, and every miss was "fixed", which in practice meant made easier. Check how the find list, hints, labels, tap sizes, the honking geese and the invitation each make finding easier, and whether anything makes it harder.
4. Research, with sources: what makes the hidden-object games people love last (Hidden Folks, Where's Waldo, Hidden Through Time, I Spy, and others you find), what makes browser games spread, and what Awwwards Site of the Day winners that are games or playful sites have in common. Note what Awwwards actually scores.

## Interview the owner

Before you recommend anything, ask the owner (a few questions at a time, with options and your recommendation first). Find out:
- What "popular" means to them: players, shares, press, a portfolio piece, revenue.
- Web only, or an app someday.
- How much time and money they'll put in, and for how long.
- What they love most about it now, and what they'd cut.
- How they feel about the mystery format going back to being the Manor's alone, which means deciding what All-You-Can-Eat becomes.
- The name: whether Goose at Large (the research's pick) still fits the game the strategy describes, and whether to rename in v2 or now.

## Look at it from every angle

Write one short section for each lens. In each, say what's working, what isn't, and what you'd change, and mark which parts you know and which you're assuming.
- **The first-time player** on a phone: the first 60 seconds, the first 5 minutes, why they'd come back.
- **The game designer:** the core loop, difficulty and its curve, variety of verbs (time, the dial and the tide already hint at it), progression, rewards, and the mystery format's place.
- **The Awwwards judge:** Design, Usability, Creativity, Content, and what a winning submission looks like.
- **Growth:** why someone shares it, what brings people back (a daily, new places, a campaign), and where it gets found.
- **The brand:** the name, the goose, the shared universe, the print style. Don't redo the naming research: test its pick (Goose at Large) against the strategy. The research says Goose of Interest wins "if the mysteries ever became the main event"; the owner wants the mystery to be the Manor's alone, so say whether that settles it. Say when the rename should happen and what it touches.
- **Production:** what each level costs now, what got repetitive for the team building them, and what a v2 round would cost.
- **Technical:** what the engine can't do yet that the strategy needs, and speed on older phones and laptops.

## Then recommend

- **The strategy:** one page. What the game is, who it's for, what makes it different, and the plan, as phases (for example: make the five great, then v2, then grow). Be decisive: one recommendation, with the options you rejected and why.
- **Difficulty:** a concrete proposal, and how the playtest and the process change so finds stop drifting easy.
- **Variety:** what makes each place play differently, not just look different.
- **The mystery:** what happens to All-You-Can-Eat if the format goes back to the Manor alone.
- **The name:** confirm or overturn Goose at Large and Geraldine, with reasons, and plan the rename: when, and what changes (the title, the URL, the repo, saves, the goose's name in the copy).
- **The leftovers:** every item under "Open, for the owner" in the roadmap (the review's leftovers from session 3d, older laptops, the Walk-Up) and the small ones from the cruise tour (`docs/levels/cruise.md`): fold each into the plan or close it.
- **The roadmap:** rewrite `docs/ROADMAP.md`'s plan and sessions to match. Keep its history and decisions. Record the dropped level and every call the owner makes today in Decisions. Update `docs/LEVELS.md` to match.
- **The next session:** its goal, one pull request, sized to finish.

## Output

- `docs/STRATEGY.md`: the strategy, the lenses, and the research with links. Link `docs/NAMING.md` for the name rather than repeating it.
- The rewritten `docs/ROADMAP.md` and an updated `docs/LEVELS.md`.
- One pull request with those, and a short summary for the owner: the strategy in five lines, the name, and the next session.

## Rules

- No changes to the game's code in this session.
- Plain language: the owner is a designer who vibe codes. Short paragraphs, no em dashes, no filler.
- Be a thinking partner, not a yes-machine. If the owner's instinct is wrong, say so and why.
- Separate what you know (you played it, you measured it, you found a source) from what you assume.
