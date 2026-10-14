# Feltroom: peer-to-peer No-Limit Hold'em

Feltroom is a free No-Limit Texas Hold'em game that runs in the browser. One player hosts, and their
browser shuffles, deals and enforces the rules. Friends join from a link, and the cards travel
directly between browsers over WebRTC. There is no game server, no account and no build step.

The site has two parts:

- **The live game** (`#/host` and `#join=<id>`): a lobby with an invite link and QR code, the table,
  host controls, chat, a game log and a game record you can copy at any time.
- **The Hand History Viewer** (`#/viewer`): paste a game record and replay every hand on the same
  table UI, with per-player stats and a chart of chip stacks over time. The viewer works offline.

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
- the QR encoder, checked against a reference encoder

---

## Playing

- **Host settings:**
  - table name and your display name
  - small blind, big blind and an optional ante
  - starting stack
  - 2–9 seats
  - action timer (off, 15s, 30s or 60s)
  - rebuys on or off
  - **Record hole cards:**
    - *All cards*: everyone's record shows every player's cards once each hand is over.
    - *Only cards shown at showdown*: each record shows your own cards plus any cards that were shown.
- **Host controls:** start, pause/resume, remove a player, adjust stacks between hands, and end the
  game. These are in the lobby, the **⋯** menu and the **Players** tab.
- **Reconnecting:** each player gets a token stored in `localStorage`. After a refresh or a dropped
  connection, reopening the link reclaims the same seat and stack. If a disconnected player is
  first to act, the timer checks or folds for them when it runs out. With the timer off, they get a
  30-second grace period.
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

## Game record format

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

### Specification

**Header.** The record starts with one `[Key "Value"]` tag per line. Feltroom writes these tags:

| Tag | Meaning |
|---|---|
| `Event` | Table name |
| `Date` | `YYYY.MM.DD` |
| `Variant` | Always `NLHE` |
| `Blinds` | `SB/BB` (**required**) |
| `Ante` | Ante per player, `0` if none |
| `StartingStack` | Buy-in amount |
| `Players` | Every player dealt into the game, comma-separated |
| `HoleCards` | `All` or `Showdown` (see visibility below) |

**Hands.** Each hand starts with `#N [Button "Name"] [Stacks "Name:chips, Name:chips, ..."]`.

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
their first post if they never act preflop. They are written as `[AhKd]`, or as `[????]` when the
owner of this copy of the record was not allowed to see them.

**Who sees which cards.** Each player's copy of the record only contains cards that player was
allowed to see:

- `HoleCards "All"`: after each hand ends, everyone's record contains every player's hole cards.
- `HoleCards "Showdown"`: your record contains your own cards and any cards that were shown.

**Names** are unique within a game. They cannot contain `; : [ ] " # , = ( )`.

**Whitespace.** Any run of spaces, tabs or line breaks counts as one space, so records survive
email wrapping and chat apps. The `;` separators are optional. Smart quotes are accepted.

**Round trip.** `serialize → parse → serialize` reproduces the text exactly. The self-test checks
this on random games in both visibility modes.

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
4. **Record notation:** serialize, parse and replay, plus stats
5. **Host table:** the authoritative game controller that runs in the host's tab; it handles seats,
   timers and personalised views
6. **Networking:** the PeerJS host and client sessions, reconnects, heartbeats, friendly error
   messages, and the `?local` transport
7. **UI:** theme, Web Audio sounds, toasts, the table renderer shared by the game and the viewer,
   and the screens
8. **QR code generator:** a tiny inline encoder (byte mode, error correction level M)
9. **Self-tests**
10. **Router**

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
