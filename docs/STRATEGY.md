# Strategy

Session 8, October 2026. How the game grows from five places. The owner signed off on the calls marked *(the owner)*; the rest are the lead's recommendations, open to overturn. The plan that follows from it is in [ROADMAP.md](ROADMAP.md). The name research is in [NAMING.md](NAMING.md) and isn't repeated here.

How to read it: **[K]** means we know it (played it, measured it, found a source). **[A]** means it's an assumption to test.

## The strategy, on one page

**What it is.** Goose at Large: a hidden-object picture book you play in a browser. Every place is a printed plate of somewhere real or ridiculous, alive on its own clock, and a goose called Geraldine is loose in all of them.

**Who it's for.** Grown-ups who loved Where's Waldo and Hidden Folks, and designers who'll send it to each other. Phone first: three minutes on the bus (a daily goose), half an hour on the sofa (a place).

**What makes it different.** Three things, and only the first is done:
1. **The print.** No other game looks like this. Hidden-object hits are black and white (Hidden Folks) or flat cartoon; Awwwards game winners are nearly all 3D WebGL. A hand-printed isometric plate stands out in both rooms. [K]
2. **Places that change while you look.** The tide comes in, the party moves, the lights go out. Hidden Through Time 2 made one day/night switch its headline feature; we have a whole clock in every place. [K]
3. **A verb per place.** Each place should play differently, not just look different: the tide on Plum Island, the lightning in the Manor. Today that's true of two places out of five. [K]

**The order of goals** *(the owner)*: an Awwwards Site of the Day first, then players, then press, then revenue. Web first; an app only if players show up *(the owner)*.

**The plan, in three phases.**
1. **v2: make the five great** (now). No new places. Finding gets a real difficulty curve, hints are earned, every place gets its own verb, the ship becomes a chase, the game becomes Goose at Large, and the first minute gets fast and smooth. Ends with the Awwwards submission.
2. **Players** (after v2 ships). A daily goose with a spoiler-free share line, medals, and the goose's trail from place to place. Make it installable. Then press.
3. **Grow** (later). New places again, each one verb first. Revenue questions (an app, paid places) only once there are players to ask.

**Rejected:**
- **Keep adding a place every session.** It's what we've done, and it's why every place is the same loop. Five places is enough for a launch; Hidden Folks shipped with 32 small areas and kept people with new verbs and free updates, not volume. [K]
- **Make the mysteries the main event.** The owner wants the whodunit to be the Manor's alone, and the research agrees it's the right call for reach: deduction games sell well as paid premium games, but they're slow, and the daily needs a minute. [K/A]
- **Go to the app stores now.** Store builds, accounts and payments would eat the v2 round, and a website is what Awwwards judges and what Wordle-style sharing needs. [K]
- **Stop at five forever.** Places are the content that brings people back. We stop adding them for one round, not for good.

## The five calls

### 1. Difficulty

The owner is right: it's too easy. Here's why, from the code and the playtests. [K]
- **The goose is the easiest thing in every room.** It's the only white goose shape in each scene, usually in the open: center of the Laundromat on a pink plinth, in the middle of the Manor's hall floor. There are no goose lookalikes anywhere.
- **The labels say where.** "A cat on the dryers" is on the dryers. Each room lists only its 2 to 4 finds, so every search is inside one small, named room.
- **Hints are free, endless and nearly the answer:** a ring about a quarter of a room wide, on the find, as often as you like.
- **The tap is generous:** at least a 44px circle, about a seventh of a room on a phone, and wrong taps cost nothing.
- **The process only ever makes finds easier.** About 36 playtest fixes made finds easier and 2 made them harder; every other "harder" change came from the owner. Ten of the Manor's 27 finds were rated "jumped out" and none was touched. The playtest counts misses and fixes them; nothing counts finds that are too easy. The quality bar says 20 to 90 seconds a find, but nothing times it.

**The proposal.** Hard, but never a trick.
- **Three kinds of find in every area.** About half **spot** (seen with a good look, plainly labeled), a third **poke** (hidden inside or behind something that opens or moves when you tap it: a drawer, a dryer door, a bush, a sleeping man's newspaper), and one or two **hard** (tiny, camouflaged, only there at one time of day, or labeled with a riddle). The goose is never a spot find. This is the spread the hidden-object games that last use (a Hidden Folks reviewer counted about half easy, then tap-to-reveal, then hard). [K]
- **Decoys for the goose.** Every place gets white lookalikes that are funny to find: a swan, a gull, a goose-shaped lamp, a man in a goose costume, a goose on a poster. A tap on one answers back ("That's a swan. Rude."). This is the single cheapest lever: the goose stops being the white thing in the room. [A: cheapest; it's drawing, not engine]
- **Labels stop giving the location** for poke and hard finds ("A cat", not "A cat on the dryers"); hard finds get a one-line riddle that says roughly where, the way Hidden Folks says the golfers saw the ball fly over the hedge. Spot finds keep plain labels. *(The owner didn't pick "make labels riddles" as a cut; this is a lighter version, for the hard third only. Overturn it if you want every label plain.)*
- **Hints are earned, in two steps** *(the owner: cut free unlimited hints)*. You start a place with 3 and earn one every few finds. The first step of a hint is a sentence ("Something under the folding table is waiting for its other half"); the second is a smaller ring, offset, so you still have to find it. Hints are counted in the save (a version bump), so a "no hints" medal is possible later.
- **Finish at most, not all.** A place's card comes when you've found the goose and most of its things; every last one is a medal. Hidden Folks and Hidden Through Time both ask for most to move on, so nobody gets stuck on one pixel. [K]
- **Taps stay 44px** (the touch-target rule), but a hard find counts only when you've pinched in close enough to see it. [A: test it; it may feel unfair]

**How the process changes so finds stop drifting easy.**
- **The playtest scores a spread, not a hit rate.** It rates every find 1 (jumped out) to 5 (never found), and an area passes when its ratings match its kinds: spot finds 1 to 3, poke finds 2 to 4, hard finds 3 to 5. A hard find rated 1 fails and gets made harder, exactly as a spot find rated 5 gets made easier. "Fix the misses" becomes "fix what's off its band".
- **The tester sees what a player sees:** a phone-sized view at the area's own framing, not a sharp 2x desktop shot.
- **QA checks the mix:** every area has its kinds, the goose isn't a spot find, every place has its decoys.
- **The quality bar** in PROCESS.md changes from "fair (20 to 90 seconds each)" to "a spread: about half spot, a third poke, a few hard; the goose never the easiest thing in its room".

### 2. Variety: a verb per place

The owner's word for what they love: "how each place feels unique and fun to explore". It's true of the look; it isn't yet true of the play. Today you do the same thing everywhere: look, tap, done. [K] Each place gets one verb that only makes sense there:

| Place | Its verb | What it means |
|---|---|---|
| The Block Party | **Poke** | The teaching place. Everything answers back: doors, dryers, drawers, the ball pit. Most poke finds live here first, and the game teaches "tap things" in its first minute. |
| Gooseworth Manor | **Deduce** | The whodunit, the Manor's alone *(the owner)*. The lightning shows the past. |
| Plum Island | **Wait for the tide** | Already its verb. Make it louder: finds marked by tide on the list, the dial front and center. |
| Moving Day | **Before and after** | The apartments empty by noon and fill by night. Some finds are what changed: the thing left behind, the box that went to the wrong floor. Spot the difference across time. |
| All-You-Can-Eat | **Chase** | The iguana is loose. Track it deck to deck through the day (below). |

Hidden Folks' lesson applies to all of them: once one thing is interactive, players expect everything to be, so the Block teaches poking and every place keeps a little of it. [K]

### 3. The mystery: the Manor's alone, and the ship becomes a chase

*(The owner.)* All-You-Can-Eat stops being a whodunit. It keeps its art, its decks, its thirteen people and its iguana, and swaps the case file for a **trail**:
- The iguana is patient zero, and it's loose. Through the ship's day it turns up in places at times (the buffet at breakfast, the pool at noon, a hammock in the crew deck in the evening).
- Each sighting is a find: spot it and the next one is unlocked ("Last seen heading below decks"). The last sighting corners it, and that's the ending.
- The suspects become witnesses: tap one and they say where they saw it. The green-for-the-wrong-reason jokes stay as decoys (a green cocktail, a green bathing suit).
- The "trail" is a new format in the game's rules (next to the whodunit), and it's reused later: the goose's trail between places in phase 2 is the same idea at a bigger scale.

I pushed back on this and the owner chose the chase over a plain goose place, which is the right answer: taking the mystery away without a replacement would have made the game more same-y, not less.

### 4. The name: Goose at Large, and the goose is Geraldine

**Confirmed** *(the owner)*. NAMING.md said Goose of Interest wins only "if the mysteries ever became the main event". The owner has decided they won't, and the ship turning into a chase makes the game more about something at large, not less. That settles it. Geraldine stays: the Courier's parcel is already addressed to "G. Goose".

**When: soon,** in the v2 round, before share images, the daily or the Awwwards submission carry the old name. The owner does three things first (NAMING.md, "Next steps for you"): register gooseatlarge.com and .app, run the trademark search, claim the handles.

**What it touches** (one session):
- The title screen's wordmark and line, `index.html`'s title and meta, the share image, the web manifest, and `src/config.js`.
- The saves' keys in the browser (`squares.save.*`): the new key reads the old one once and moves it, so nobody loses their geese. A save version bump.
- The repo (`uxpreview/squares` to `uxpreview/goose-at-large`; GitHub redirects the old URL), `package.json`, README, CLAUDE.md, and the docs' mentions.
- The URL: the new domain on Vercel, with the old address redirecting.
- Copy: Geraldine by name where the goose is named (the Courier's parcel, the completion cards, the invites), no more than the jokes need.

### 5. The leftovers

Every open item, folded into the plan or closed:

| Item | Call |
|---|---|
| Lag on older laptops (cache the Manor's backdrop, or a 1.25x step) | **Folded** into the speed session: the 1.25x step for every place; the Manor's backdrop in the Manor's pass. |
| The Block's crosshairs read as a recenter button on phones | **Drop them on phones** (keep them on desktop as print marks), in the first-impression session. |
| The things counter means nothing until your first find | **Folded** into the difficulty session's top bar (hints left join it; it needs a redesign anyway). |
| The find list's two round buttons and its 100px header | **Folded** into the same redesign. |
| No double-tap to zoom | **Folded** into the first-impression session. |
| A whodunit's overview doesn't show rooms still holding evidence | **Folded** into the Manor's pass (it's the only whodunit now). |
| The Manor's staircase instead of the lift; the monocle reveal only pays off with the parcel | **Folded** into the Manor's pass. |
| Casts beyond people (the Catminium, the zoo) | **Stays** with those levels, in phase 3. |
| Delete the Walk-Up? | **Closed: keep it hidden** as the stacked-floors test bed; it costs nothing. Delete it when the Catminium ships, as planned. |
| The ship's density pass (the Cabins' back corridor, the Crew Bar before 3pm) | **Folded** into the ship's chase session, which reworks those decks anyway. |
| The ship's frames a second not re-measured on the owner's laptop after 7b | **Folded** into the ship's chase session (it measures on the laptop at the end). |
| The Pool at 66 ms in cloud QA, Adults Only 7 ms slower | **Folded** into the speed session. |
| The ship's 614 KB download, the biggest | **Folded** into the speed session (places load while you're on the picker). |

## Through every lens

### The first-time player, on a phone

**Working.** [K] The title is a knockout: the Block Party drifting under a big friendly wordmark and one "Play" button. The picker is a card per place, one to a screen. On the Block's overview a card says "A goose in every room. Step inside." with a ring on the Observatory. Inside the Laundromat, the find list sits under the picture with four plain labels.

**Not working.** [K] Inside the Laundromat, three of four finds are visible in seconds (the goose on the pink plinth, the cat on the dryers, the red sock on the line); only the coin takes a scan. The first five minutes feel like a checklist: each room is a short list of easy finds, then the next room. Nothing brings you back tomorrow: no daily, no medals, no "new" except the badge on a place you haven't opened.

**Change.** The first minute teaches one verb (poke) with one easy find, then shows you the goose is harder than it looks (a decoy). The first five minutes have a spread of easy and hard. Coming back: the daily goose (phase 2).

### The game designer

**Working.** [K] The clock is a real idea: places change while you watch, and a few finds are only there at one time (nine of them, on Plum Island and Moving Day). The whodunit is a real format with an accusation and a reveal. The tide's skip button is the first verb beyond tapping.

**Not working.** [K] The loop is one verb (look, tap) at one difficulty, with no curve inside a place or across places. Rewards are a tick and a count. The hint makes failure impossible, so success means little.

**Change.** Kinds of find (spot, poke, hard), decoys, earned hints, a verb per place, finish at most. Medals for all, no hints, and the hard ones (phase 2). [A: medals matter to this audience; Hidden Folks has none and does fine, so keep them light]

### The Awwwards judge

Awwwards scores Design 40%, Usability 30%, Creativity 20%, Content 10%, from at least 18 jurors; a Site of the Day also goes to a developer jury for the Developer Award (accessibility, speed, responsive, markup). Submitting costs $65. [K, [Awwwards](https://www.awwwards.com/about-evaluation/)]

- **Design (40%): strong.** The print style is unlike the 3D winners (Messenger, Igloo Inc, Bruno Simon). [K]
- **Usability (30%): the risk.** Judges mark down long loaders, unclear first steps and dropped frames on phones. We have no loader problem (the biggest place is 194 KB zipped) [K], but on the owner's 2017 laptop the areas run at 12 to 33 frames a second [K], picture changes cut rather than flow, and the find list's buttons are unclear.
- **Creativity (20%):** the clock and the verbs. Today it reads as a very pretty hidden-object game. [A]
- **Content (10%):** the jokes are there; a judge needs to see one in the first ten seconds.

**A winning submission:** the title in under a second, one continuous motion from the picker into a place, a sound bed per place, a steady frame rate on a mid-range phone, the first find in under a minute, and a case study page. Lead with the print and the clock.

### Growth

**Why someone shares it.** Today: because it's beautiful. That gets a "look at this" once. Wordle went from 90 players to millions in about two months after it added a share grid that showed how you did without spoiling it. [K, [Slate](https://slate.com/culture/2022/01/wordle-game-creator-wardle-twitter-scores-strategy-stats.html)]

**What brings people back.** A daily, mostly: one goose a day, hidden in one of the five places, the same for everyone, found in a minute or three, with a share line ("Goose at Large #12. Found her at the Town Beach in 1:42, no hints."). The roadmap's no-timers rule stays for the main places; the daily can show a time because it's the bragging layer. [A: the daily is what spreads; it's the pattern of every browser hit we found, but not proven for a hidden-object game]

**Where it gets found.** Awwwards and the design press first (the order the owner chose), then social posts of the daily, then game press with the v2 story. Hidden Folks' updates were each a press moment; new places in phase 3 work the same way. [K/A]

### The brand

The name and the goose are settled above. The shared universe works and should get louder: the Courier with the parcel for G. Goose, Gander Cola, Inspector Pidge one place behind. Every place keeps one character from another. The print style is the brand; the wordmark's thick outline and the offset shadow are already recognizable. [A]

### Production

**Cost per level today.** [K] About 30 commits, 8 to 13 artist agents plus an art director, 2 to 5 sessions, and 9,000 to 26,000 lines of drawing code per place. The owner's review time fell from six rounds (the Manor) to one (the ship), so "each level cheaper" holds for the owner, not for the total work.

**What got repetitive.** [K] The same bugs in every level, found by eye, mostly in the pinched-in tour: people drawn inside furniture and cars (3 levels), speech bubbles over faces (3), walkers through furniture or water (4), finds painted over by their furniture (QA can't see it), leftover greybox, seams. The fix is machine checks for the two worst (a find painted over, a person inside a solid thing), so the tour finds taste, not bugs.

**What v2 costs.** About ten sessions (the roadmap lists them). The owner works a few sessions a day in small steps *(the owner)*, so the limit is the owner's review time, not the team's. [A] Each retune session ends with the owner playing one place on a phone.

### Technical

What the strategy needs that the engine can't do yet: [K]
- **Poke finds:** a thing that opens, moves or answers when tapped, with a find inside it. This is the start of E8 (mechanic hooks), sized down: a find can be `inside` a thing with an open and a closed drawing.
- **Decoys:** a tap target that isn't a find and says a line.
- **Kinds of find, earned hints, finish at most:** game rules and a save version bump (v4).
- **The trail format** for the ship (and later the goose's trail between places).
- **The daily:** a seed by date, a pool of hand-placed daily spots per area, a share line. No server needed.
- **Speed:** the 1.25x sharpness step on older laptops, the Pool's frame time, and loading places while you're on the picker (P3).

## Research

Most pages were read through search summaries (the proxy blocked many sites); numbers are as reported by the linked page.

### Hidden-object games that last
- **Hidden Folks** (2017): 32 hand-drawn areas, 300+ targets, 500+ interactions; $14.99 on Steam with about 9,400 reviews at 97% positive; free and paid updates kept it in the news. [Press kit](https://hiddenfolks.com/press), [Steam](https://store.steampowered.com/app/435400/Hidden_Folks/), [TouchArcade](https://toucharcade.com/2017/06/15/the-lovely-hidden-folks-just-got-factory-update-adds-3-new-areas-to-the-game/)
- Its clues are jokes that point to a part of the level, and hiding uses size, one-of-ten-alike, timing and sound; bushes, tents and doors answer a tap with a mouth sound, and once one thing was interactive, players expected everything to be. [Medium interview](https://medium.com/@stefanlesser/behind-the-game-hidden-folks-e6198dfa885a), [Game Developer](https://www.gamedeveloper.com/design/building-thousands-of-tiny-interactions-into-i-hidden-folks-i-), [Gamezebo](https://gamezebo.com/2017/02/22/hidden-folks-review-found-art)
- A reviewer counted three tiers in a big area: about half easy, then ones you reveal by tapping, then the hard ones. [Geeky Hobbies](https://www.geekyhobbies.com/hidden-folks-indie-game-review/)
- **Hidden Through Time 1 and 2:** find enough, not all, to move on; misclicks cost nothing; each era restarts easy. The sequel's headline feature flips a map day/night or summer/winter, with some finds in only one state. A level editor with player-written hints added hundreds of levels. [GameGrin](https://www.gamegrin.com/reviews/hidden-through-time-review/), [KeenGamer](https://www.keengamer.com/articles/reviews/switch-reviews/hidden-through-time-2-myths-magic-review-a-surprising-hidden-object-game-switch/), [GameSpew](https://www.gamespew.com/2020/03/hidden-through-time-review/)
- **The Case of the Golden Idol** (500k to 1M owners) and **Return of the Obra Dinn** (about 500k): deduction by looking, checked in a way you can't brute-force (Obra Dinn confirms three at a time). They sell as paid premium games. [SteamSpy](https://steamspy.com/app/1677770), [Wireframe](https://wireframe.raspberrypi.com/articles/obra-dinn-the-rule-of-three)
- **Where's Wally:** 86M+ copies since 1987. **I Spy:** rhyming riddles, tens of millions sold. [Wikipedia](https://en.wikipedia.org/wiki/Martin_Handford), [Wikipedia](https://en.wikipedia.org/wiki/I_Spy_(book_series))

### Why browser games spread
- **Wordle:** about 90 players in November 2021, about 300,000 by mid-January 2022, millions weeks later; the turn was the spoiler-free share grid. One puzzle a day, about three minutes, no app, no sign-up. [Slate](https://slate.com/culture/2022/01/wordle-game-creator-wardle-twitter-scores-strategy-stats.html), [TechCrunch](https://techcrunch.com/2022/01/12/josh-wardle-interview-wordle/)
- **Neal.fun:** about 8 to 9.6M visits a month (weak source); The Password Game passed 10M visits; Draw a Perfect Circle spread as people filmed their score. [Similarweb](https://www.similarweb.com/website/neal.fun/), [Wikipedia](https://en.wikipedia.org/wiki/The_Password_Game)
- **Framed** reports 1M+ daily players; **GeoGuessr** runs a daily challenge with a streak. [Framed](https://framedgame.io/), [GeoGuessr changelog](https://geoguessr.canny.io/changelog)
- The shape they share: one URL, nothing to install, a first win in a minute, and a result you can share without spoiling it.

### Awwwards
- Scoring, jury and Honorable Mention: [Awwwards evaluation](https://www.awwwards.com/about-evaluation/), [FAQ](https://www.awwwards.com/faqs/). Developer Award: [Awwwards](https://www.awwwards.com/developer-award/). Fee: [Submit](https://www.awwwards.com/submit/).
- Playful winners: Messenger by Abeto (Site of the Year 2025, built to stay "vibrant even on an old phone"), Igloo Inc (Site of the Year 2024), Bruno Simon's portfolio (Site of the Year 2019, and Site of the Day again in January 2026), and the hand-drawn *The Boat* by SBS. [Messenger](https://www.awwwards.com/sites/messenger), [Igloo Inc](https://www.awwwards.com/sites/igloo-inc), [Bruno Simon](https://www.awwwards.com/sites/brunos-portfolio), [The Boat](https://www.sbs.com.au/whats-on/article/the-sound-and-vision-of-the-boat/67xsuhjh5)
- What sinks sites there: heavy pages, many requests, accessibility and contrast errors. [Greenspector](https://greenspector.com/en/analysis_sites_nominated_mobile_excellence_awwwards/)
