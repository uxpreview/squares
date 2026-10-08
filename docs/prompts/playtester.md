# Prompt: playtester

The lead sends this to one fresh agent that hasn't seen the code, once the art direction pass is done (see [PROCESS.md](../PROCESS.md), step 7). Before sending it, run `node tools/playtest.mjs {{LEVEL_ID}} prepare`: it writes a clean shot of every area and `labels.json` (the find labels, and nothing about where they are) to `qa-out/{{LEVEL_ID}}/playtest/`. Fill in every `{{BLANK}}`. Everything below the line is the prompt.

---

You're playtesting a level of **Goose at Large**, a hidden-object picture book: every area is a busy little scene, and the game gives you a list of things to find in it. You tap a thing to find it. You're a fresh player: you've never seen this level, and you won't look at how it's made.

The level is **{{LEVEL_NAME}}**. {{ONE_LINE}}

## What you have

- `qa-out/{{LEVEL_ID}}/playtest/labels.json`: for each area, its name, its screenshot, and the list of things to find there, exactly as a player sees them.
- The screenshots in the same folder, one per area, as a player sees the area on a phone.

## The rules

1. **Screenshots only.** Don't open anything under `src/`, don't read `answers.json`, don't run the game's code other than the two commands here. You're a player, not a developer.
2. For each area, look at its screenshot and find each thing on its list. Note where it is as pixel coordinates `[x, y]` in that screenshot. If you can't find something, use `null`. No guessing at random: only give a spot you'd actually tap.
   - **You can look closer:** crop and enlarge part of a shot, the way a player pinches in on a phone. Give your coordinates in the full shot.
   - **Some things are hidden inside other things** that open when you tap them: a cupboard, a heap, a door. You can't see those in the shot. If you think something's inside something, give the spot you'd tap to open it.
   - A line under a thing's name in `labels.json` (`riddle`) is printed under it on the list: a clue to roughly where.
   - **Some things that look like the goose aren't.** Only one is the goose. In the game a lookalike answers back when tapped ("Not a goose."), so for the goose you may give two spots, `[[x, y], [x, y]]`: your first tap, and where you'd look next if it turned out to be a lookalike. The second only counts if the first really was one.
3. Keep honest notes as you go: which things jumped out, which took a long look, which you never found, and any label that made you look for the wrong thing.

## Score yourself

Write your answers to a file, for example `guesses.json`, with how hard each one was (1 jumped out, 2 a quick look, 3 a proper search, 4 a long hunt, 5 never found it):

```json
{
  "library": { "A pill bottle with beak marks": [812, 604], "Goose feathers on the rug": null },
  "kitchen": { "A kitchen timer": [1320, 710] },
  "ratings": {
    "library": { "A pill bottle with beak marks": 3, "Goose feathers on the rug": 5 },
    "kitchen": { "A kitchen timer": 1 }
  }
}
```

(area ids are the keys of `labels.json`; labels exactly as listed). Rate honestly before you score: the game wants a spread, some easy and some hard, so a 1 is as useful as a 4. Then run:

```
node tools/playtest.mjs {{LEVEL_ID}} check guesses.json
```

It tells you which you found, and how each one's difficulty compares with what it's meant to be. Don't change your answers or ratings after seeing the score; report them as they were.

## Part two, for a whodunit: the case

If the playtest folder has a `case/` folder, the level is a mystery: you find evidence, then accuse a suspect. After the hunt (and after scoring it), look at the shots in `case/`, in order. They're the case file as a player meets it: the suspects, one suspect up close, accusing them, the mystery suspect with half its clues found, the file with every clue found, naming the culprit, and the reveal. Then answer:
- Before the last shots: from the case file alone, **who do you think did it, and why?** When did you guess?
- Would a player know **what to do** to solve it, without being told? What would they try first?
- Did the **accusation scene** make you laugh? Which line landed, which didn't?
- Does the **story hold together** once you've seen the reveal? Anything that doesn't add up?

## Part two, for a place with a clock you can skip: the dial

If `labels.json` gives some things a `when` ("low tide", "high tide", "sunset"), they're only there some of the time; the game prints it beside them. Each area's `dial` is the text on the round button in the corner of its shot.
- **Before looking further:** in `place.png`, what do you think the round button does? What would you expect a tap to do?
- Then `place-dial.png`: the same place a moment after tapping it once. What changed? Was that what you expected?
- Some areas have `<name>-dial.png` (the same view after one tap) or `<name>-later.png` (later in the day, if you wait). Guess the things that weren't there in the first shot in those, under those keys in your guesses file (`"turnpike-1-dial": { "A car key on a float": [x, y] }`). Look in the first shot first.
- Would a player know **why** a thing isn't there, and **what to do about it**, from the list's note and the dial alone?

## Report

For each area, a line per find:
- **Found or not**, and **how hard** it was: 1 (jumped out), 2 (a quick look), 3 (a proper search), 4 (a long hunt), 5 (never found it).
- **Why**, when it was hard: too small, hidden, too dark, lost in clutter, a label that points the wrong way.

Then, overall:
- The **three finds most in need of moving or relabeling**, and what you'd change. Too easy counts as much as too hard.
- Which **goose lookalikes** fooled you, even for a second, and which you saw through at once.
- Anything that was **confusing about the scene itself** (what's going on, where one area ends).
- The **funniest thing** you noticed, and anything that fell flat.
- For a whodunit or a place with a dial, your answers to part two.
