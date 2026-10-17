# Feltroom: peer-to-peer Hold'em and Omaha

Feltroom is a free poker game that runs in the browser. It plays No-Limit or Pot-Limit Texas
Hold'em, Omaha and 5-Card Omaha. One player hosts, and their
browser runs the table and enforces the rules. Friends join from a link, and everything travels
directly between browsers over WebRTC. There is no game server, no account and no build step.

With the **encrypted deal** (on by default) every player's browser helps shuffle and only you can
unlock your own cards. The host's device never sees anyone else's hand, not even with developer
tools open. See [Fair play and anti-cheat](#fair-play-and-anti-cheat).

**Host controls (off by default).** By default the host can't change anyone's chip stack or remove
anyone from the table, in hosted games and in Play vs Bots. To allow it, tick **Host can change
players' chip stacks** and/or **Host can remove players from the table** (in Play vs Bots: **I can
change chip stacks** / **I can remove bots**). Only then do the Adjust stacks and Remove buttons appear.
The table itself refuses those commands otherwise, even from a modified page. Every change is
written to the log, and the record notes both settings.

**Waiting Room (off by default).** The home screen has a **Waiting Room** that lists public
tables. A table shows up only if its host ticked **List this table in the public Waiting Room** when
setting it up.

- **Listing:** each listed table shows its name, the host's name, the game, blinds, starting stack,
  how many seats are taken and whether it's still waiting to start.
- **Join and Watch:** **Join** takes you to the normal join screen. **Watch** appears when the host
  also allows viewers.
- **Invite links still work:** the host can still send invite links (and viewer links) as usual;
  listing only adds the table to the Waiting Room.
- **Ending:** the listing disappears when the game ends or the host leaves. The option is not
  remembered between tables.
- **No server:** the Waiting Room uses 24 well-known "room slot" IDs on the free PeerJS broker. A
  listed table claims a free slot with an extra broker connection, and the Waiting Room asks every
  slot which table is there. A full scan takes a second or two.
- **Untrusted listings:** every answer is cleaned and escaped before it is shown, because anyone
  could answer on a slot. Joining a table from the list is exactly like opening an invite link.

**Viewers (off by default).** Tick **Allow viewers with a watch-only link** when you set up a table,
in either **Host a game** or **Play vs Bots**. You then get a separate **viewer link** (the eye button
in the top bar, or the ⋯ menu) that you can send at any point in the game.

- **What viewers see:** the table, bets, board, log and chat, but never anyone's hole cards. They
  only see hands turned face up at showdown, which every player sees too.
- **What viewers can't do:** sit down, act, or get game records or the deal's proofs.
- **A separate address:** the viewer link connects to its own broker ID, not the players' invite
  link, so it can't be edited into a seat at the table.
- **Viewer chat:** a second option, **Viewers can post in the chat**, lets them talk. Their messages
  are marked "(viewer)".
- **Not remembered:** both options start switched off for every new table.

**Bots cheer you on (off by default).** In Play vs Bots, this setting makes the bots post corny,
encouraging messages in the chat, for example "Believe in the river! 🌊" or "WOW, that pot was HUGE! 🏆".
They speak at the start, after your wins and big pots, after a bust, and now and then in between.

**Mobile or computer?** The first time you open the site it asks which you're on (it suggests one
for your device). Your choice is remembered, and the home screen has a button to switch.

- **Mobile** stacks the table in rows: the other players as compact tiles, then the board, then
  your own seat with big cards, then the action buttons. Nothing is ever drawn on top of anything
  else, so the board and every player's cards and name are always fully visible. Chat has its own
  button with an unread count, recent messages appear in a strip under the table, and the log,
  chat and player list open as a sheet from the bottom. On small screens the table scrolls to your
  seat when it's your turn.
- **Computer** always keeps the oval table, in the game and in the viewer. Each player's bet and
  dealer/blind badges sit inside their seat, and after every update the table measures itself: if
  anything would touch the board, another seat or the edge of the window, it shrinks slightly.

The site has four parts:

- **The live game** (`#/host` and `#join=<id>`): a lobby with an invite link and QR code, the table,
  host controls, chat, a game log and a game record you can copy at any time.
- **Play vs Bots** (`#/bots`): practise offline against 1–8 computer players. There are seven
  difficulty levels and eight play styles, and it works in any of the game variants.
- **Play Against Cepheus** (`#/cepheus`): heads-up limit Hold'em against a CFR+ strategy computed
  on Cepheus's exact game. It is an approximation, not Cepheus itself; see
  [Play Against Cepheus](#play-against-cepheus).
- **The Hand History Viewer** (`#/viewer`): paste a game record and replay every hand on the same
  table UI, with stats and a chart of chip stacks over time. The viewer works offline.
  - **Per player:** hands, wins, net chips, bb/100, VPIP, PFR, 3-bet, fold to 3-bet, limp,
    aggression factor and frequency, c-bet, fold to c-bet, check-raises, WTSD, W$SD, WWSF, all-ins,
    streaks and more.
  - **Table overview:** average pot, showdown rate, split pots, and which hands won.
  - **Stat key:** a key at the bottom of the panel explains exactly how each stat is counted.
    Hovering over any stat shows its definition too.
- **Learn Poker** (`#/learn`): 25 lessons in four chapters, from the deck and hand rankings to side
  pots, pot limit, Omaha, outs, pot odds, expected value, implied odds, bet sizing, combinations and
  stack-to-pot ratio. Every rule has a worked example, every formula is written out, and each lesson
  ends with a short quiz. Hand names, raise limits, side pots and equities in the examples are
  computed by the game's own engine, so they always agree with the table. A Tools lesson has a pot
  odds and EV calculator, an outs calculator, a bet-size calculator and an equity calculator.
  Progress is saved in your browser.

Everything is in one file, `index.html` (HTML, CSS and JavaScript inline). The only external
resource is the PeerJS library, loaded from a free CDN.

```
poker/
├── index.html     the whole app
├── netlify.toml   optional: a few security headers, no build command
└── README.md      this file
```

---

## Deploy to Netlify (free)

### Option A: Netlify Drop (about 30 seconds, no Git)

1. Go to **https://app.netlify.com/drop**. If you don't have a Netlify account, sign up for the free
   plan. Netlify does not ask for a credit card.
2. Drag the **`poker` folder** (the one that contains `index.html`) onto the page.
3. Netlify gives you a URL like `https://random-name-123.netlify.app`. Open it. That's your poker room.
4. Optional: in **Site configuration → Change site name**, pick something nicer such as
   `fridaypoker.netlify.app`.

To update the site later, open the site in Netlify, go to **Deploys**, and drag the folder onto
the drop area again.

### Option B: connect a GitHub repository

1. Push this repository to GitHub.
2. In Netlify, choose **Add new site → Import an existing project → GitHub** and pick the repository.
3. Use these build settings:
   - **Base directory:** `poker`
   - **Build command:** leave it empty
   - **Publish directory:** `poker` (Netlify fills this in from the base directory)
4. Click **Deploy**. Every push to the branch redeploys automatically.

`netlify.toml` in the `poker` folder sets `publish = "."` and adds a few headers. It has no build
command and uses no Functions or Forms.

All routes are hash-based (`#/host`, `#/viewer`, `#join=<id>`, `#/selftest`), so any link works on
static hosting and refreshing never returns a 404. You don't need redirect rules. Invite links are
built from `location.origin`, so they work on any Netlify subdomain or custom domain.

---

## Run it locally

Any static file server works:

```sh
cd poker
python3 -m http.server 8000      # or:  npx serve .
```

Then open http://localhost:8000.

### Test multiplayer with two browser tabs

1. In tab 1, open `http://localhost:8000/#/host`, enter a name and click **Create table**.
2. Click **Copy invite link** in the lobby.
3. Open the link in **tab 2**, type a different name, click **Join game**, then click an empty
   **Sit** seat.
4. In tab 1, click **Start Game**. Play from both tabs, or use the keyboard (`F`, `C`, `R`).

Notes:

- This uses the real free PeerJS broker, so it needs an internet connection. The game data itself
  goes tab to tab.
- **Three or more players in one browser:** browsers share `localStorage` between tabs, so a new
  tab offers **Rejoin as …**. Type a new name and click **Join as new player** instead. You can
  also use a private window or a second browser.
- **Fully offline:** add `?local` to the URL, for example `http://localhost:8000/?local#/host`. The
  tabs then talk over `BroadcastChannel` with no broker. This only works within one browser and is
  meant for development.
- **Phones on your Wi-Fi:** open `http://<your-computer's-LAN-IP>:8000/#join=...`. Copying to the
  clipboard needs HTTPS, so on a plain-HTTP LAN address type or scan the link instead. The QR code
  in the lobby is generated in the page.

### Self-tests

Open **`#/selftest`** (for example `http://localhost:8000/#/selftest`). The browser runs the built-in
test suite and lists pass/fail results. The suite covers:

- every hand category, kicker ties and the wheel straight
- heads-up and multi-way blinds, minimum raises, and short all-ins that don't reopen the betting
- side pots, split pots and odd chips
- showdown order and auto-muck
- 500 random hands checked for chip conservation
- record round-trips, tolerant parsing, error line numbers and replay consistency
- Omaha's two-plus-three hand rule, pot-limit maximums and per-hand blind levels
- statistical (chi-square) checks that shuffles are uniform
- bots taking only legal actions across every variant, plus sanity checks on their equity
- the advanced stats (3-bet, c-bet, check-raise and others), checked against a hand worked out by hand
- SHA-256 against the standard test vectors, the shuffle permutation, and fair-deal checks that
  catch swapped cards, wrong board positions and excluded seeds
- the encrypted deal: card encoding, commuting locks, key checks, the zero-knowledge proof (and
  that it fails on any change), and that a player never gives out its own hole-card keys
- the Learn lessons: the maths matches the standard numbers, every lesson renders and every quiz
  answer is valid
- the QR encoder, checked against a reference encoder

---

## Playing

- **Host settings:**
  - game: **Texas Hold'em**, **Omaha** (4 hole cards) or **5-Card Omaha** (up to 8 seats)
  - betting: **No limit**, **Pot limit** or **Limit** (fixed limit), in hosted and bot games. Limit is
    used only when the host picks it.
  - table name and your display name
  - small blind, big blind and an optional ante
  - starting stack, and optionally **blinds that go up** every 10, 20 or 30 hands
  - 2–9 seats
  - action timer (off, 15s, 30s or 60s)
  - rebuys: none, 1, 2 or 3 per player, or unlimited
  - **Encrypted deal** (on by default): nobody can see anyone else's cards, the host included
    (see Fair play)
  - **I'm playing too:** turn this off to use the host's device only as the dealer
  - **Record hole cards:**
    - *All cards*: everyone's record shows every player's cards once each hand is over.
    - *Only cards shown at showdown*: each record shows your own cards plus any cards that were shown.
- **Host controls:** start, pause/resume, remove a player, adjust stacks between hands, and end the
  game. These are in the lobby, the **⋯** menu and the **Players** tab.
- **Reconnecting:** each player gets a token stored in `localStorage`. After a refresh or a dropped
  connection, reopening the link reclaims the same seat and stack. If a disconnected player is
  first to act, the timer checks or folds for them when it runs out. With the timer off, they get a
  30-second grace period.
- **Clear my data:** the home screen has a **Clear my data on this device** button. It removes your
  saved name, last table settings, rejoin links and saved game records. You can choose to keep or
  reset your display preferences. Name boxes also tell the browser not to remember past entries.
- **Bots replace disconnected players** (host setting, off by default). Turning it on shows a warning
  first. While a player is disconnected, a bot plays their seat with their chips until they come
  back.
  - Hands in which any bot made a decision are **left out of the player-only record**. That is what
    **Copy Game Record** copies.
  - Those hands appear only in the **full record**, tagged `[Bots "Name"]`. Use **Copy full record
    (with bot hands)** in the ⋯ menu.
- **Chat you can't miss:** every message pops up as a speech bubble over the sender's seat. When the
  chat tab isn't open, recent messages also appear in a small feed in the corner of the table; click
  one to jump to the chat. In a background tab, a soft sound plays and the tab title shows the
  message. You can turn the on-table popups off with **Show chat on the table** in the ⋯ menu.
- **If the host leaves:** everyone sees *"Host left, game ended"* and can still copy, download or
  replay their record up to that point. Records are also saved in each player's browser.
- **Keyboard shortcuts:**
  - `F` fold, `C` check or call, `R` focus the raise amount
  - arrow keys change the bet by one big blind; `Enter` confirms
  - `M` mutes the sound; `?` opens the help overlay
- **In the viewer:**
  - `←`/`→` steps one action back or forward
  - `Shift+←`/`→` jumps by street
  - `↑`/`↓` changes the hand
  - `Space` starts or stops autoplay

### How the poker rules work

- **Shuffling and dealing.** The host shuffles with `crypto.getRandomValues` (an unbiased
  Fisher–Yates shuffle). The host validates every action. Clients send only intents, such as
  `{t:"action", action:"raise", amount:40}`.
- **Hidden cards.** Each player receives a personalised state that never contains another player's
  hole cards until they are shown at showdown or the player chooses to show them.
- **Blinds and button.** Heads-up, the button posts the small blind and acts first before the flop.
- **Omaha.** A hand must use exactly two hole cards and exactly three board cards. Four flush
  cards on the board with one in your hand is not a flush.
- **Pot limit.** The largest bet is the pot. The largest raise is to the current bet plus the pot
  after calling. For example, with blinds of 1/2 the first raise is at most to 7.
- **Limit (fixed limit).** Every bet and raise is exactly one fixed size: the big blind before the
  flop and on the flop, twice the big blind on the turn and river. With blinds of 1/2 that is 2, 2,
  4, 4. Each betting round allows at most 4 bets (a bet and 3 raises; before the flop the big blind
  counts as the first bet). There is no bet slider: the raise button shows the one legal amount. A
  short all-in does not count toward the cap and does not reopen the betting. Records use the
  variants `FLHE`, `FLO` and `FLO5`.
- **Rising blinds.** Blinds and antes are multiplied by 1, 2, 3, 5, 8, 10, 15, 20, … at each level.
- **Raises.** A raise must add at least as much as the previous full raise. An all-in that is
  less than a full raise does not reopen the betting for players who have already acted. Several
  short all-ins that add up to a full raise do reopen it.
- **Uncalled bets.** An uncalled bet goes back to the player who made it.
- **Pots.** The app builds side pots in layers and splits tied pots. Odd chips go to the winner
  closest to the left of the button.
- **Showdown.**
  - The last aggressor on the river shows first. If nobody bet, the first player left of the button
    shows first.
  - Each later player shows only if their hand can still win or tie a pot. Otherwise they muck,
    unless they turned auto-muck off.
  - If players were all-in and the board was run out, everyone shows.
- **Busting.** A player who runs out of chips can rebuy when rebuys are allowed. Otherwise they sit out.

---

## Bots

Each decision runs a pipeline:

1. **Read the hand from public information.** The bot looks at every player's position, every
   bet and its size compared with the pot, and lines such as check-raises, donk bets (leading into
   the previous street's aggressor), barrels on every street and overbets.
2. **Equity.** A Monte-Carlo simulation is run against each opponent's likely hands, using a fast
   built-in hand evaluator (about 6.7 million hands per second).
   - **Preflop ranges** come from the opponent's actions, position and history.
   - **After the flop**, every bet narrows their range toward its strongest part, and bigger bets
     narrow it more. Calls drop the weakest part.
   - **Each range keeps a share of bluffs** that matches how often that player has been seen
     bluffing at showdown.
3. **The numbers:** pot odds, implied odds, stack-to-pot ratio, outs and blockers. Outs only count
   cards that improve the bot's own hand, not cards that pair the board for everyone. Fold equity
   is estimated by bet size, from how often each opponent folds to small and big bets.
4. **Candidate actions,** each scored in chips, then shaped by the bot's style:
   - Preflop uses position-aware ranges with soft edges, so borderline hands are mixed. Re-raises
     can be for value or a bluff (with a blocker), and short-stacked play is all-in or fold.
   - After the flop, strong hands raise for value.
5. **Balanced sizing and safe mixing.**
   - From Advanced up, bluffs and strong hands share the same big "polar" sizes and medium hands
     use smaller ones, with overlap and a little jitter. A bet's size says little about the hand.
   - Bots vary between actions that are close in value, but never pick one that is clearly bad.
   - No level ever folds a full house or better, and strong bots never fold the nuts.
   - Strong hands are slow-played now and then, so a raise is not a guaranteed tell.

| Level | What it adds |
|---|---|
| Beginner | Raw hand strength only; ignores position, calls too much, has size tells |
| Casual | Pot odds, some position, starts to notice that bets mean strength |
| Intermediate | Equity against real ranges, reads bet sizes, push/fold when short |
| Advanced | Reads lines (check-raise, donk bet, three barrels); balanced bet sizes |
| Professional | Opponent model: fold rates by bet size, showdown bluff evidence |
| Elite | Deeper simulations, blockers, sharper exploits |
| Extreme | Deepest simulations, most careful reads, balanced bluffs and sizes |

The play styles are Balanced, Tight-aggressive, Loose-aggressive, Tight-passive, Loose-passive,
Maniac, Trapper and GTO-inspired. GTO-inspired adds minimum-defence-frequency defending to the
balanced settings.

**A style is a tendency, not a script:**
- Every bot gets its own randomised version of its style. Each trait varies, and there is a
  hidden pinch of a second style.
- Its mood drifts from hand to hand, with the occasional change of gear.
- So two "Maniacs" don't play identically, and a table of identical labels doesn't move in
  lockstep.

Bots never see hidden cards. They get the same information a real player at that seat would have.
Simulations run in small chunks, so the page stays responsive even with eight bots.

**How the current engine was tested** (bb/100 = big blinds won per 100 hands, ± is the 95% range):

- Six-bot tables of every style: preflop participation, fold-to-continuation-bet rates, walks,
  showdowns and bluff shares fall in realistic ranges.
- Simple scripted strategies lose to Intermediate and above: always call, always min-raise,
  always all-in, random betting, and value-only overbetting. The value-only overbetter beat the
  old Elite (+233 bb/100) but loses to the new one (−225 ± 96).

---

## Play Against Cepheus

**Play Against Cepheus** (`#/cepheus`) is heads-up fixed-limit Texas Hold'em against one strong
computer opponent. It is **an approximation of Cepheus, not Cepheus itself**.

**Background.** In 2015 the University of Alberta's Cepheus essentially solved this game with an
algorithm called CFR+. Its strategy is more than 10 TB and was never published. The `CFR_plus`
archive its authors released contains the solver code, the game definition and a hand evaluator,
but no strategy.

**What we built from it** (details in `poker-tools/cepheus/README.md`):

- The same CFR+ algorithm, run on Cepheus's exact game. The betting tree is read from the
  archive's `holdem.limit.2p.reverse_blinds.game` and has 6,378 decision points.
- Similar hands are grouped together: the 169 starting hands, then 50 hand-strength groups on the
  flop, turn and river. This keeps the strategy to a 579 KB file.
- Hands are ranked with the archive's own evaluator, in the solver and in the browser.
- The strategy was computed in 100 minutes on 4 CPU cores (14,273 iterations).

How strong it is, in exact expected value over 1,000 sampled boards, playing both seats with
every hand:

| Opponent | Big blinds per 100 hands |
|---|---|
| Always call | +50.6 |
| Always raise | +34.0 |
| Random play | +78.6 |

It also beats its own earlier training snapshots by a little, and that margin shrinks as training
goes on, which shows it is converging.

**The game:**

- Blinds are 5/10. Bets are 10 before the flop and on the flop, 20 on the turn and river.
- There are at most 4 bets per round.
- Both stacks reset to 1,000 every hand, as in Cepheus's game, where stacks are unlimited.
- Your running result appears in the table header and the player list.

**How it plays:**

- It decides using only its own cards, the board and the betting. It never sees your cards or
  future cards.
- Its decisions are randomised with the strategy's own probabilities, so it is hard to read.
- If it ever met a situation its strategy does not cover, it would check or call and say so in
  the log. This has not happened in testing.

**Loading.** The engine (`cepheus/cepheus.js`, 12 KB) and the strategy
(`cepheus/cepheus-strategy.bin`, 579 KB) are separate static files. They are downloaded only when
you press **Play Cepheus**. The page pins both files: the engine with Subresource Integrity, the
strategy with SHA-256. A missing, damaged or mismatched file shows a clear error and leaves the
other modes untouched.

The CFR+ code and hand-ranking tables are used under the archive's licence
(`cepheus/LICENCE-CFR_plus.txt`). Feltroom is not affiliated with or endorsed by the University
of Alberta.

---

## Fair play and anti-cheat

In a peer-to-peer game someone's device runs the table. Feltroom is built so that device can't see
your cards or cheat, and so other players can't either.

### Encrypted deal: nobody sees your cards, not even the host

This is on by default (**Host a game → Fair play → Encrypted deal**). It uses "mental poker":
commutative encryption over the 2048-bit group of RFC 3526 (group 14).

1. **Everyone shuffles.** Each card is a number. In turn, every dealt player's browser locks all 52
   cards with its own secret key and shuffles them. Locks commute (x^(a·b) = x^(b·a)), so they can be
   removed in any order, and a card is readable only when every lock is off. Nobody knows the
   final order. The host's own seat shuffles last.
2. **Re-lock.** In turn, each browser removes its shuffle lock and puts a separate lock on every
   card position. It publishes the before and after values together with a zero-knowledge
   (Chaum–Pedersen) proof that it removed exactly its own lock and changed nothing else. Every
   browser checks every proof.
3. **Deal.** Every player hands out their keys for the *other* players' hole-card positions, never
   their own. Your browser collects everyone else's keys for your cards and adds its own, so **only
   your browser can read your cards.** The host's device only relays locked cards and keys that
   can't open anything by themselves.
4. **Board cards** are unlocked street by street. A browser gives out its key for a board card only
   once its own view of the hand has reached that street. Every key is checked against its owner's
   published before/after values, and each browser unlocks the board itself and compares it with
   what the host shows.
5. **Showdown.** Your browser shows your hand by giving out your own keys, or mucks it if your
   auto-muck setting says so. It only does this at a real showdown: this hand, five board cards it
   unlocked itself, and you're still in. Folded and mucked hands are never revealed, except on
   "All cards" tables, where every hand goes into the record once the hand is over.

What this rules out, even for a host who rewrites their copy of the program:

- **Reading anyone's cards.** The host never holds your last key. No message can make your browser
  decrypt something on its behalf: browsers only hand out keys, and never the keys to their own
  cards.
- **Swapping, copying or inventing cards.** A wrong key, a doctored card, a duplicate or an
  altered shuffle step fails a check. The deal stops, and the player whose browser did it is named
  and sat out.
- **Peeking at the next street early.** Nobody can unlock a board card until every player has
  released their key for it.

Costs of the encrypted deal:

- Each deal takes a second or two (more at a full Omaha table) while the browsers do the maths.
- Every dealt player must stay connected. If someone leaves mid-hand and doesn't come back within
  30 seconds, that hand is cancelled and everyone gets their chips back. Players who are
  disconnected when a hand starts sit it out. Refreshing the page is fine: keys are kept in the
  tab's session storage.
- "Bots replace disconnected players" isn't available, because a bot can't play cards nobody can
  see.

The one thing it can't fully stop: a player who modifies their own copy and is first to shuffle
could secretly plant a marked card. Each attempt leaves a card that can't be unlocked somewhere in
the deck. If that card gets dealt, the hand stops with a tampering warning, and it only rarely
lands where it would help. Proving every shuffle in zero knowledge would close this gap, but it
would take many seconds per hand in a browser. The host can't do this, because the host's seat
always shuffles last.

### Standard deal: a provably fair shuffle

With the encrypted deal turned off, the host's browser deals, and every player checks it:

1. Before every hand, the host shuffles a secret deck and publishes a SHA-256 commitment for each
   card (the card plus a random salt).
2. Every connected browser then commits to its own random seed, and afterwards reveals it. This
   includes seated players, players sitting out, spectators and the dealer. The deck is
   unpredictable as long as any one of them is honest.
3. The final order is computed from all the seeds together, so the host can't choose who gets
   which card: the deck was locked in before it knew the players' randomness.
4. Each card a player sees arrives with its salt, and the player's browser checks it against the
   commitment for that card's position. This covers their own cards, the board and shown hands.
5. Each player's browser also replays the hand through the rules engine and checks the result.

In this mode the dealing device can see every card. If that matters, untick **I'm playing too**
and host from a device nobody plays on. The standard deal is faster and works with bot takeover.

If any check fails, in either mode, the player sees a red **Check failed** badge and an alert
explaining what didn't match. The shield button in the top bar shows the status.

### What other players can't do, even with developer tools open

- **See other players' cards.** Each player's browser only ever receives that player's own hole
  cards, or the keys to them, plus cards that are shown. Reading the page's code or network
  traffic reveals nothing.
- **Act for someone else, or act illegally.** Players send only requests ("raise to 40"). The host
  checks every request against the rules. Each seat is tied to a random 128-bit token, and host
  commands (start, pause, remove, stacks, end) are never accepted from the network.
- **Flood the host.** Each connection is rate-limited.

No software can stop two players from telling each other their cards through another app.

### How this was tested

Automated attacks are run against the real code:

- **The host's view of an encrypted game** (`sratest`) covers dozens of simulated hands with 2 to 6
  players, in Hold'em, Omaha and 5-Card Omaha and both record modes. It gathers every message the
  host relayed, plus the host's own keys, and tries to unlock every other player's hole cards.
  It succeeds only for hands that were shown, as it should.
- **A hostile dealer** (`sraattack`) tries to make a browser give up its cards:
  - asking for board keys before the street
  - asking for showdown keys mid-hand, or on a board the browser didn't unlock itself
  - asking for an "All cards" reveal on a showdown-only table
  - forcing a second shuffle or re-lock of the same hand
  - feeding it a non-standard starting deck, a duplicated card, a forged proof or an altered chain
  - sending a wrong key, or a key copied from another position

  Every attempt is refused or caught, and the culprit is named.
- **A three-browser game in headless Chromium** with the encrypted deal: hands play to
  showdown, the host's table holds no hole cards at any point, a player refreshes mid-hand and
  keeps their cards, and records contain each player's own cards.
- **A "spy" player** records everything their browser receives in standard-deal games. The test
  checks that no unshown hole card ever appears in that data and that none can be worked out by
  elimination.
- **A hostile player** sends crafted messages that try to:
  - claim the host's or another player's seat
  - re-send "hello" to spawn extra identities or swap identity
  - sit in impossible seats
  - send host-only commands
  - act out of turn or with absurd bet amounts
  - flood the table with fake joins
  - pollute JavaScript objects with names such as `__proto__`
- **A hostile host** sends script-injection payloads in every field: names, cards, seats, chat,
  records and fairness messages.

**Page hardening:**

- A strict Content-Security-Policy: only the page's own two scripts (pinned by hash) and the exact
  PeerJS release may run.
- Subresource Integrity on PeerJS.
- Every update from the host is rebuilt into a known-safe shape before it is displayed.
- Invisible and text-direction characters are stripped from names and chat, so nobody can disguise
  themselves as another player.
- The offline `?local` test transport only works on localhost.
- Frame and opener isolation headers.

All the cryptography (SHA-256 and the big-number maths) is built into the page, so it works over
plain HTTP too and nothing is downloaded.

**Where the randomness comes from.**

- Every random choice uses the browser's cryptographically secure generator
  (`crypto.getRandomValues`), which is fed by the operating system. This covers the shuffle,
  seeds, salts, the first button and tokens.
- Shuffles use Fisher–Yates with rejection sampling, so there's no modulo bias and all 52!
  orders of the deck are possible.
- Card salts are 256-bit, so the card commitments can't be brute-forced.
- The host refuses to start if the secure generator is missing.
- The `#/selftest` page runs chi-square tests showing that:
  - every card lands in every position equally often
  - neighbouring cards don't stick together
  - the final deck is evenly shuffled if just the host, or just the players, are honest

---

## Game record format

### Compact records (what Copy Game Record gives you)

**Copy Game Record** copies a **compact record**: one short line that starts with `♣`, for
example `♣b煴瓶赉东俼寻…`. It holds exactly the same data as the full text record: every tag,
setting, card, action, showdown and result. The viewer turns it back into the identical text
record, character for character. A typical game is about 7 to 13 times shorter. A 4,302-character
sample becomes 489 characters.

How it is made, all in the browser at no cost:

1. The record is packed into bytes. Player names are stored once and then referred to by number.
   Common tags and values come from a built-in dictionary. Starting stacks are stored as the change
   from the previous hand.
2. The bytes are compressed with the browser's built-in `deflate-raw` compression.
3. Each 14 bits becomes one CJK character (U+4E00 onwards). `a`/`b` after the `♣` marks whether
   the last character holds 7 or 14 bits.

Anything changed or cut off is rejected with a clear error instead of loading wrong data. The
viewer accepts compact records and text records, whether pasted or loaded from a file. To get
the human-readable text instead, use **Copy readable record (text)** in the table menu. Downloaded
files are always readable text.

### Text format

The record is plain text, similar to chess PGN. It contains everything needed to replay each hand
exactly. Here is the first hand of the built-in sample game:

```
[Event "Friday Night Game"]
[Date "2026.10.09"]
[Variant "NLHE"]
[Blinds "1/2"]
[Ante "0"]
[StartingStack "200"]
[Players "Alice,Bob,Carol,Dave"]
[HoleCards "All"]

#1 [Button "Alice"] [Stacks "Alice:200, Bob:200, Carol:200, Dave:200"]
Bob sb 1; Carol bb 2
Dave [Ah4d] f; Alice [9sTd] f; Bob [5d3h] c 2; Carol [ThJd] x
F: Kd 8s 9h; Bob x; Carol b 31; Bob r 71; Carol c 71
T: 2d; Bob x; Carol x
R: 5h; Bob x; Carol b 20; Bob c 20
SD: Carol shows [ThJd]; Bob shows [5d3h]
=> Bob wins 186 (Pair of Fives)
```

Records also carry every table setting as extra header tags, for example `[Mode "Hosted"]`,
`[Game "No-Limit Hold'em"]`, `[MaxSeats "9"]`, `[ActionTimer "15s"]`, `[BlindsUp "Never"]`,
`[Rebuys "Unlimited"]`, `[Deal "Encrypted"]`, `[HostPlays "On"]`, `[BotTakeover "Off"]`,
`[WaitingRoom "Off"]`, `[Viewers "On"]`, `[ViewerChat "Off"]`, `[HostCanChangeStacks "Off"]` and
`[HostCanRemovePlayers "Off"]`. Play vs Bots records list
`[BotPlayers "..."]` with each bot's level and style, `[BotSpeed "..."]` and `[BotsCheer "..."]`.
Readers ignore tags they don't know.

### Specification

**Header.** The record starts with one `[Key "Value"]` tag per line. Feltroom writes these tags:

| Tag | Meaning |
|---|---|
| `Event` | Table name |
| `Date` | `YYYY.MM.DD` |
| `Variant` | `NLHE`, `PLHE`, `FLHE`, `NLO`, `PLO`, `FLO`, `NLO5`, `PLO5` or `FLO5` (No-limit / Pot-limit / Fixed-limit; Hold'em, Omaha, 5-Card Omaha) |
| `Blinds` | `SB/BB` (**required**) |
| `Ante` | Ante per player, `0` if none |
| `StartingStack` | Buy-in amount |
| `Players` | Every player dealt into the game, comma-separated |
| `HoleCards` | `All` or `Showdown` (see visibility below) |

**Hands.** Each hand starts with `#N [Button "Name"] [Stacks "Name:chips, Name:chips, ..."]`.
In games with rising blinds, each hand also carries its own `[Blinds "SB/BB"] [Ante "N"]` tags.

- `Stacks` lists only the players dealt into this hand, in clockwise seat order, with their chips
  at the start of the hand.
- The small blind and big blind follow from the button and the seat order. With exactly two
  players, the button posts the small blind.

**Lines inside a hand**, in this order:

1. **Posts:** `Name a N` (ante), `Name sb N`, `Name bb N`. N is the amount actually posted, which can
   be less than the blind if the player is short.
2. **Preflop actions.**
3. **Later streets:**
   - flop: `F: c1 c2 c3; actions`
   - turn: `T: c; actions`
   - river: `R: c; actions`

   Streets that are run out with no betting (because players are all-in) list only the cards.
4. **Showdown and shows (optional):** `SD: Name shows [AhKd]; Name mucks`, in showdown order. Cards
   that a player chooses to show after the hand come after the showdown entries.
5. **Result:** `=> Name wins N` for each pot share, separated by `;`.
   - When there is more than one pot, each share adds `from main pot` or `from side pot K`.
   - Showdown wins add the hand name in parentheses, for example `(Full House, Kings over Sevens)`.
   - Uncalled bets that go back to the bettor are not listed, because they can be derived.

**Action tokens** have the form `Name [cards]? verb amount?`:

| Verb | Meaning | Amount |
|---|---|---|
| `f` | fold | – |
| `x` | check | – |
| `c` | call | the caller's **total bet on this street** after calling |
| `b` | bet | total bet on this street |
| `r` | raise | total bet on this street, so `r 18` means "raise to 18" |

All amounts are whole chips.

**Cards.** A card is a rank from `2 3 4 5 6 7 8 9 T J Q K A` followed by a suit from `s h d c`.

**Hole cards** appear once per player. They are written on the player's first preflop action, or on
their first post if they never act preflop. They are written as `[AhKd]` (Omaha: four or five
cards, such as `[AhKdQsJc]`), or as question marks such as `[????]` when the owner of this copy of
the record was not allowed to see them.

**Who sees which cards.** Each player's copy of the record only contains cards that player was
allowed to see:

- `HoleCards "All"`: after each hand ends, everyone's record contains every player's hole cards.
- `HoleCards "Showdown"`: your record contains your own cards and any cards that were shown.

**Names** are unique within a game. They cannot contain `; : [ ] " # , = ( )`.

**Whitespace.** Any run of spaces, tabs or line breaks counts as one space, so records survive
email wrapping and chat apps. The `;` separators are optional. Smart quotes are accepted.

**Round trip.** `serialize → parse → serialize` reproduces the text exactly. The self-test checks
this on random games in both visibility modes.

**Bots.** A hand in which a bot made any decision carries `[Bots "Name1,Name2"]` after its other
tags. Such hands appear only in full records. Player-only records leave them out.

**Validation.** The viewer replays every hand through the same rules engine that the live game
uses. It flags these problems per hand:

- wrong blinds
- illegal bets, such as a raise below the minimum
- out-of-turn actions
- results that don't match the cards

It also notes stack changes between hands, such as rebuys or adjustments by the host. Parse errors
include the line number, and a **Show line** button selects the line in the text box.

---

## How the code is organised

`index.html` contains clearly marked sections:

1. **Utilities**
2. **Cards & hand evaluator:** pure functions; the best five of seven cards, with descriptions such
   as "Full House, Kings over Sevens"
3. **Rules engine:** pure, with no DOM, network or randomness; the caller deals the cards, which is
   what makes exact replays possible
4. **Fair shuffle and encrypted deal:** SHA-256 commitments, and the mental-poker protocol (each
   player's side, and the host's relay, which only ever handles locked cards)
5. **Record notation:** serialize, parse and replay, plus stats
6. **Host table:** the authoritative game controller that runs in the host's tab; it handles seats,
   timers and personalised views
7. **Networking:** the PeerJS host and client sessions, reconnects, heartbeats, friendly error
   messages, and the `?local` transport
8. **UI:** theme, Web Audio sounds, toasts, the table renderer shared by the game and the viewer,
   and the screens
9. **QR code generator:** a tiny inline encoder (byte mode, error correction level M)
10. **Self-tests**
11. **Learn Poker:** lessons, quizzes and calculators
12. **Router**

---

## Why this costs $0

Everything below is free, with no account, API key, card or trial required, except for Netlify's
free plan, which needs an email sign-up but no card.

| Thing used | What it does | Cost |
|---|---|---|
| **Netlify free plan** (static files only) | Hosts `index.html` | Free. No Functions, Forms, Identity, or any other metered feature is used. |
| **PeerJS** 1.5.4 (MIT licence) from **unpkg**, with **jsDelivr** as a fallback | WebRTC data-channel library | Free, open source, served by free public CDNs |
| **PeerJS cloud broker** (`0.peerjs.com`, the default `new Peer()`) | Only introduces browsers to each other; game traffic doesn't pass through it | Free public service, no API key |
| **Google and Cloudflare public STUN servers** (`stun.l.google.com:19302`, `stun1.l.google.com:19302`, `stun.cloudflare.com:3478`) | Help browsers find a direct path to each other | Free public servers, no key |
| Fonts | System font stack (`system-ui`, Segoe UI, Roboto, …) | Free; no web fonts are downloaded |
| Cards, chips, table, icons | Drawn with CSS and inline SVG | Free; written for this project |
| Sounds | Generated live with the Web Audio API | Free; no audio files |
| QR code | Generated in the page by an inline encoder | Free; no remote QR service |
| Fair-shuffle proofs and the encrypted deal | SHA-256 and big-number maths, written into the page | Free; no service involved |
| Learn Poker lessons and calculators | Written into the page | Free; works offline |
| Charts | Hand-written SVG | Free; no chart library |
| Ads, analytics, tracking, telemetry | None | n/a |

**About TURN:** no TURN relay is configured or needed for most home and mobile networks. On very
strict networks (some offices, schools or VPNs), a direct connection can fail. The app then shows a
"Connection blocked" message with a Retry button; joining from another network, such as a phone
hotspot, usually fixes it. *Optional:* if you want a relay, you can add a free, no-card TURN
service to `Net.ICE` in `index.html`. The game works without one.

---

## Troubleshooting

| Message | Fix |
|---|---|
| **Game not found** | The host closed their tab, or the link was cut off. Ask for a fresh link. |
| **Can't reach the matchmaking broker** | `0.peerjs.com` is unreachable or busy. Check your connection and press Retry. |
| **Connection blocked** | A firewall or VPN is blocking peer-to-peer traffic. Try another network. |
| **Could not load PeerJS** | A content blocker blocked unpkg and jsDelivr. Allow them, then Retry. |

Hosting tip: the host's tab is the game server. Keep it open, preferably in the foreground and on
power, until the game is over.
