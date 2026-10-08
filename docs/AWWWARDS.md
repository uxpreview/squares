# The Developer Award

Session 18a, October 2026. Where Squares stands on the Awwwards Developer Award, what 18a changed, how to measure it again, and what's left for 18b. The plan is in [ROADMAP.md](ROADMAP.md) (session 18); why Awwwards first is in [STRATEGY.md](STRATEGY.md).

## How it's judged

A Site of the Day goes on to a developer jury, who score it 1 to 10 on six things; an average over about 7 wins the award. Recent winners score highest on Animations and WPO (speed) and lowest on Semantics and Markup. [K: [Awwwards evaluation](https://www.awwwards.com/about-evaluation/), and the six scores published on winners' pages: [Messenger](https://www.awwwards.com/sites/messenger) 8.21 (Animations 9.0, WPO 8.8, Accessibility 7.6), [FUNCTION](https://www.awwwards.com/sites/function) 7.51, [Podium](https://www.awwwards.com/sites/podium) 7.27]

| Criterion | What a developer juror looks at | Squares |
|---|---|---|
| **Semantics / SEO** | Headings and landmarks, a title and description that say what it is, crawlable text, robots and a sitemap | Done in 18a (below) |
| **Animations** | Smooth, purposeful motion, nothing janky, reduced motion respected | Already the strength: the picker card grows into its place, the drift, the pen loops. 18a removed the title's start-up stutters |
| **Accessibility** | Keyboard use, screen readers, contrast, focus, motion | G5, done in 18a (below) |
| **WPO** (web performance) | Lighthouse, load time, page weight, caching, no jank | Improved in 18a (below); the limit is a canvas that animates nonstop |
| **Responsive** | Phone, tablet, desktop, landscape | Already phone first (390 px up, landscape phones, iOS bars) |
| **Markup / meta-data** | Valid HTML, meta and share tags, icons, manifest, structured data | Done in 18a, except the share image (18b) |

## What 18a did

**Accessibility (G5).**
- **Keyboard play.** While you play, the map is a Tab stop. Focused, a printer's registration mark sits in the middle of the picture; the arrow keys (or WASD) move the map under it, and move the mark itself where the map can't go any further (on a whole place that fits the screen); Enter or Space taps under the mark; + and − zoom round it; Escape goes back. A click never gives the map focus, so for the mouse nothing changed. Everything else was already buttons. (`src/engine/input.js`, "Keys"; `placeAim` and `area` in `src/game/play.js`.)
- **Screen readers.** The map is named for what it shows ("The Laundromat, The Block Party") and described: every one of the 61 areas has a `describe`, and every place a `words.describe` (66 in all, written from screenshots by six writers, then checked so none says where a find is). Arriving somewhere is said (with the blurb the first time, as the story card shows it), a thing that answers a tap says its line, finds were already said by the toast. Behind the title and the picker, the map is hidden from screen readers as scenery. QA's copy check now requires every description.
- **Contrast.** Small coral, teal and place-ink labels were 2.5 to 4 to 1 (room numbers, "Place complete", the case file's kicker, the trail log's later sightings, the picker's subtitles and badges, the brass lift's unlit floors). Each takes a deeper shade of its own ink now (`--coral-text`, `--teal-text`, `color-mix` with the navy): 4.5 to 1 or better, same hue.
- **Names that match the words on the button** (WCAG 2.5.3, for voice control): the back button, the room pill, the Case and Trail button, the tide dial, the list's room headings, the suspects, the picker cards. Extra words for a screen reader sit in hidden text, never an `aria-label` that drops what's printed.
- **Motion and flashes.** Reduced motion was already respected everywhere (the camera, the intro, cards, the case file). The Manor's lightning strobes twice per strike, strikes 15 to 25 seconds apart: under WCAG's three flashes a second. Left as is (several rooms key their art to its brightness).

**Semantics and markup.**
- The page's title follows where you are ("The Laundromat · The Block Party · Squares"); one `h1` per screen ("Pick a place" was an `h2`); the screens sit in a `main`; the picker cards are made of spans (a button can only hold phrasing content; they had headings and paragraphs inside); the case file is a `div` dialog; no empty headings.
- The `<head>`: a description that says what it is, the canonical address, Open Graph and Twitter tags, the author, structured data (a `VideoGame`, free, in the browser), `color-scheme`.
- Icons: `favicon.ico`, `apple-touch-icon.png`, 192 and 512 icons and a maskable one, all drawn from the goose favicon (`node tools/icons.mjs`); `site.webmanifest`; `robots.txt` and `sitemap.xml`; a `noscript` page listing the five places.
- The W3C validator: no errors (warnings only for the `h1` of each screen, which show one at a time, and `aria-hidden` on things that start hidden).

**Speed (WPO).**
- **The title had no "largest paint".** Every word on it faded in from 0 opacity, which the browser doesn't count as painted, so Lighthouse couldn't score speed at all. The fade now starts at 1% (it looks the same).
- **The title stalled twice while it drifted:** fetching the other places behind it also ran Plum Island's and Moving Day's land (every half unit of ground traced at once), 300 ms and 110 ms. A land is now worked out when it's first needed, and the title prepares it a few milliseconds after each frame (`makeLand` and `prepare` in `src/engine/terrain.js`, `warm` in `src/main.js`). After its first frame the title never blocks; the picker draws all its cards a little sooner than before (1.5 to 1.6 s against 1.6 to 1.7 s, a phone in the cloud) with less blocking.
- **Caching:** the built files (named by their contents) are kept for a year (`vercel.json`), plus two safe headers (`nosniff`, a referrer policy).

## The numbers

Lighthouse 12 in the cloud (no graphics chip: canvas drawing is done by the processor, which flatters nothing), the title screen, before and after 18a:

| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Phone | unscorable (no largest paint) → **62** | 100 → 100 | 100 → 100 | 91 → **100** |
| Desktop | unscorable → **90** | 100 → 100 | 100 → 100 | 91 → **100** |

After, on the phone: first paint 1.2 s, largest paint 3.3 s, no layout shift. Desktop: 0.4 s, 0.7 s, total blocking 220 ms.

The title on slow 4G with a 4x slower processor (`node tools/load.mjs`, three runs each): 0.90 to 0.91 s before 18a, 0.89 to 0.93 s after. The new head costs nothing.

**Why the phone score stops at about 60.** Lighthouse's phone test slows the processor 4x in its arithmetic and counts every task over 50 ms as blocking. The title's map draws every frame (about 12 ms of work on this machine, so about 50 ms in Lighthouse's arithmetic), and the page never goes quiet, so it adds up to 4 s of "blocking" without anything actually stuck. On a real phone the graphics chip does the drawing. What's left that's real is the first frame (about 350 ms: drawing every room of the Block Party for the first time). Options if it matters to the jury: draw the title's map from one cached picture while it drifts, or start the drift after the first second. Neither done; both cost some of the title's life.

**axe** (`npm run a11y`): every screen and state on a phone and a desktop (the title, the picker, a place, a room, its whole list, the Manor at night, the case file, the tide dial, the trail log, the place-complete card): before, low-contrast labels and buttons whose spoken names didn't match their words, on most screens; **none** after.

## Measure it again

- `npm run a11y`: axe on every screen (above). Exits non-zero on any problem.
- `npm run smoke`: includes the keyboard and screen reader checks (Tab to the map, the aim, Enter, +, the arrows, Escape, the names and descriptions, the page's title).
- `npm run qa -- <place>`: the copy check wants every description.
- Lighthouse: `npm run build && npm run preview`, then Chrome's DevTools, Lighthouse tab, on the address it prints (or `npx lighthouse <address> --view`). On the live site: [PageSpeed Insights](https://pagespeed.web.dev/) on squares.ryankm.com.
- The W3C validator: [validator.w3.org/nu](https://validator.w3.org/nu/?doc=https%3A%2F%2Fsquares.ryankm.com%2F) on the live site (or the built `dist/index.html`).
- `npm run build && node tools/load.mjs`: the title on slow 4G (should stay under a second).

## On the owner's Mac

18a was built and checked in the cloud, which has no graphics chip and no Safari. These need a real machine, the 2017 MacBook Pro (the slowest we know plays it). Start from `main` (`git checkout main && git pull`), then `npm install`: 18a added `axe-core`. Run on October 8, 2026; what they found is under the list.

1. **The title's first five seconds, by eye.** It now prepares Plum Island's and Moving Day's land a few milliseconds after each frame. Invisible on a quick machine; on the old laptop, check the drift doesn't stutter.
2. **Frames a second where the land changed:** `node tools/fps.mjs plum --auto` and `node tools/fps.mjs southie --auto`. Before 18a: Plum Island's areas 20 to 23 with sharpness stepping down, Moving Day's apartments about 25, the road and park 17.
3. **QA with the speed check** (skipped in the cloud, where timings aren't trustworthy): `npm run qa -- plum` and `npm run qa -- southie`.
4. **Lighthouse on a real graphics chip:** `npm run build && npm run preview`, then Chrome, DevTools, Lighthouse, Mobile, on the title. This is what a juror sees in their own browser. Well above the cloud's 62, the title's drift stays as it is; near 60, decide on the options under "The numbers".
5. **By hand:** Chrome: a place, Tab once, the arrows, Enter, + and −. Safari: Tab only reaches text fields unless "Press Tab to highlight each item" is on (Safari's Advanced settings), or use Option+Tab; that's Safari's default, not the game's. VoiceOver (Cmd+F5): Tab to the map and hear the place named and described; step into a room and hear its name and story.

18a is merged, so anything that regressed gets fixed in a small follow-up PR, before 18b starts.

**What they found (October 8, the 2017 laptop, Intel HD 630).** Nothing regressed; no fixes were needed.

1. **The title, by eye:** smooth in Chrome, reloaded several times. Timed in a visible Chrome window, the title's stalls while it starts add up to 370 to 470 ms (one, the first frame, about 300 to 400 ms). The build just before 18a stalls 1,030 to 1,330 ms in four or five pieces, so on this laptop 18a's land preparation took more than half a second off the title's start.
2. **Frames a second** (`--auto`, so sharpness steps down to 1.25x as it does for players): Plum Island's whole map 40, its areas 20 to 30 (20 to 23 before). Moving Day's whole map 41, the apartments 22 to 32 (about 25 before), Farragut Road and Marine Park 24 to 30 (17 before), Castle Island 16, the same as the build before 18a. (It read 13 at the end of one long run, when the laptop had slowed down; on its own, twice, 16.)
3. **QA with the speed check:** both pass, no failures. Plum Island's slowest view is the Center at 42 ms against the 60 ms budget (the Turnpike at 41 when it shipped); Moving Day's is Farragut Road at 53 ms, then Castle Island at 41. The warnings are the usual ones (heads behind things, finds small on a phone, Castle Island's three hard finds).
4. **Lighthouse 12** (`npx lighthouse@12`, which opens a visible Chrome; three runs each, the title): accessibility, best practices and SEO 100 everywhere. Performance on a phone 56, 60 and 67 (first paint 1.3 to 2.3 s, largest paint 2.1 to 4.4 s, no layout shift); on a desktop 71 all three times (0.5 s, 0.7 s, total blocking about 800 ms, nearly all of it the first frame on this older processor). So the phone score lands near 60, as in the cloud: the call under "The numbers" is the owner's, before 18b. The lead's recommendation: draw the title's map from one picture while it drifts. That's the option that moves the score, because the blocking is every frame's drawing, the whole time; starting the drift a second later only moves the first second. It costs the small movements on the title while it drifts.
5. **By hand:** Chrome's keyboard play, Safari with Option+Tab, and VoiceOver (the place named and described, a room's name and story on arriving) all as described. `npm run smoke` and `npm run a11y` pass here too.

## Left for 18b (with the rename)

- **The name and the address:** `<title>`, the description, `og:site_name` and `og:url`, `canonical`, the JSON-LD (`name`, `url`), `site.webmanifest` (`name`, `short_name`), `robots.txt` and `sitemap.xml` (the address), the `noscript` page, `src/config.js`. Everything that carries the name or the address is in those files; nothing else in the page does.
- **Share images:** an `og:image` and `twitter:card` → `summary_large_image`, one per place if the hash routes get their own (they can't today: one page, one set of tags).
- **The case study page** for ryankm.com (P5) and **the submission** ($65).
- **Later (21):** the manifest's `display` goes from `browser` to `standalone` with offline play, when the game becomes installable. It's `browser` now on purpose, so Chrome doesn't offer to install a game that doesn't work offline yet.
