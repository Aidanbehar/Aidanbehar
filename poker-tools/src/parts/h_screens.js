
/* =====================================================================
   7b. UI SCREENS  (home, host setup, join, live table, ended)
   ===================================================================== */
const App = { root: document.getElementById('app'), session: null, screen: null };

function topIconButtons() {
  return `<button class="btn sm ghost" data-appearance aria-label="Appearance: felt, cards and theme">${icon('palette')}<span class="hide-sm">Appearance</span></button><button class="btn ghost icon-btn" data-theme-toggle aria-label="Toggle light or dark theme">${Theme.icon()}</button>`;
}
function bindThemeToggles(root) {
  $$('[data-appearance]', root).forEach((b) => b.addEventListener('click', appearanceModal));
  $$('[data-theme-toggle]', root).forEach((b) => b.addEventListener('click', () => { Theme.toggle(); $$('[data-theme-toggle]').forEach((x) => { x.innerHTML = Theme.icon(); }); }));
}

/* ---------- Home ---------- */
function HomeScreen() {
  document.title = TitleFlash.base = "Feltroom · Peer-to-peer Hold'em";
  App.root.innerHTML = `<div class="page"><div class="page-inner">
    <header class="row"><div class="brand"><div class="logo" aria-hidden="true">♠</div><strong style="font-size:18px">Feltroom</strong></div><span class="grow"></span>${topIconButtons()}</header>
    <section class="hero"><div>
      <div class="hero-felt" aria-hidden="true"><div class="mini-table"></div>
        ${cardHtml('As', '', 'left:72px;--cw:44px;transform:rotate(-8deg)')}${cardHtml('Kh', '', 'left:106px;--cw:44px;transform:rotate(7deg)')}</div>
      <h1>Hold'em with friends.<br>Just send a link.</h1>
      <p>Free, peer-to-peer Texas Hold'em and Omaha that runs entirely in your browser, with an encrypted deal that keeps every hand private, even from the host. No accounts, no downloads, no game servers.</p>
      <div class="home-actions">
        <button class="big-choice" data-go="#/host"><span class="bc-ic">${icon('plus')}</span><strong>Host a Game</strong><span>Choose blinds and stacks, share the invite link, and deal.</span></button>
        <button class="big-choice" data-go="#/rooms"><span class="bc-ic">${icon('users')}</span><strong>Waiting Room</strong><span>Browse public tables other people are hosting right now, then join or watch with one click.</span></button>
        <button class="big-choice" data-go="#/bots"><span class="bc-ic">${icon('bot')}</span><strong>Play vs Bots</strong><span>Practice offline against computer players, from Beginner to Extreme.</span></button>
        <button class="big-choice" data-go="#/cepheus"><span class="bc-ic">${icon('shield')}</span><strong>Play Against Cepheus</strong><span>Heads-up limit Hold'em against a CFR+ strategy built on Cepheus's exact rules (an approximation, not Cepheus itself).</span></button>
        <button class="big-choice" data-go="#/solver"><span class="bc-ic">${icon('calc')}</span><strong>Heads-Up Limit Solver</strong><span>Enter your cards, the board and the betting: see exactly how often to fold, call or raise, and your chance of winning.</span></button>
        <button class="big-choice" data-go="#/viewer"><span class="bc-ic">${icon('history')}</span><strong>Hand History Viewer</strong><span>Paste a game record to replay every hand, with stats. Works offline.</span></button>
        <button class="big-choice" data-go="#/learn"><span class="bc-ic">${icon('book')}</span><strong>Learn Poker</strong><span>From the rules to pot odds and expected value, with examples, quizzes and calculators.</span></button>
      </div>
      <div class="pill-row"><span class="pill">100% free</span><span class="pill">No sign-up</span><span class="pill">Peer-to-peer</span><span class="pill">Encrypted, provably fair deal</span><span class="pill">No ads or tracking</span></div>
    </div></section>
    <footer class="home-foot">Every player's browser helps shuffle and only you can unlock your cards. Everything travels directly between players; nothing is stored on a server.
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn sm ghost" id="h-device">${icon(Device.mobile ? 'monitor' : 'phone')}Switch to ${Device.mobile ? 'computer' : 'mobile'} layout</button><button class="btn sm ghost" id="h-wipe">${icon('x')}Clear my data on this device</button></div></footer>
  </div></div>`;
  bindThemeToggles(App.root);
  $$('[data-go]', App.root).forEach((b) => b.addEventListener('click', () => { location.hash = b.dataset.go; }));
  $('#h-wipe').addEventListener('click', wipeModal);
  $('#h-device').addEventListener('click', () => { Device.set(Device.mobile ? 'computer' : 'mobile'); route(true); });
  return {};
}

/* ---------- First visit: mobile or computer? ---------- */
function DeviceScreen(next) {
  document.title = TitleFlash.base = 'Welcome · Feltroom';
  const g = Device.guess();
  App.root.innerHTML = `<div class="page"><div class="page-inner" style="justify-content:center">
    <div class="center-card card-ui device-pick">
      <div class="logo" aria-hidden="true" style="margin:0 auto">♠</div>
      <h2>Welcome to Feltroom</h2>
      <p class="muted" style="margin:0">How are you playing? You can switch any time from the home screen.</p>
      <div class="device-opts">
        <button class="big-choice ${g === 'mobile' ? 'suggest' : ''}" data-dev="mobile"><span class="bc-ic">${icon('phone')}</span><strong>Mobile</strong><span>Phone or tablet. Players sit around a table sized for your screen, cards and names never overlap, and chat is one tap away.</span>${g === 'mobile' ? '<em>Suggested for this device</em>' : ''}</button>
        <button class="big-choice ${g === 'computer' ? 'suggest' : ''}" data-dev="computer"><span class="bc-ic">${icon('monitor')}</span><strong>Computer</strong><span>Laptop or desktop. The classic oval table with the log, chat and players beside it.</span>${g === 'computer' ? '<em>Suggested for this device</em>' : ''}</button>
      </div>
    </div></div></div>`;
  $$('[data-dev]', App.root).forEach((b) => b.addEventListener('click', () => {
    Device.set(b.dataset.dev);
    if (location.hash !== next) location.hash = next || '#/';
    else route(true);
  }));
  return {};
}

/** Appearance: theme, felt, card backs, rail, card faces. Every change shows at once and is remembered on this device. */
function appearanceModal() {
  const sw = (key, list) => `<div class="swatches" role="radiogroup" data-ap="${key}">${list.map(([v, l, c]) => `<button type="button" class="swatch" role="radio" data-v="${v}" aria-checked="${Theme.pick(key, list) === v}" aria-label="${l}" title="${l}" style="background:${c}"></button>`).join('')}</div>`;
  const seg = (key, opts, cur) => `<div class="seg" role="radiogroup" data-ap="${key}">${opts.map(([v, l]) => `<button type="button" role="radio" data-v="${v}" aria-pressed="${v === cur}" aria-checked="${v === cur}">${l}</button>`).join('')}</div>`;
  const pills = (key, list) => `<div class="ap-pills" role="radiogroup" data-ap="${key}">${list.map(([v, l]) => `<button type="button" class="btn sm" role="radio" data-v="${v}" aria-pressed="${Theme.pick(key, list) === v}" aria-checked="${Theme.pick(key, list) === v}">${l}</button>`).join('')}</div>`;
  const m = openModal(`<h2>${icon('palette')} Appearance &amp; sound</h2>
    <div class="ap-preview" aria-hidden="true">${cardHtml('As')}${cardHtml('Kh')}${cardHtml('Qd')}${cardHtml('Tc')}${cardHtml(null)}</div>
    <div class="ap-row"><span>Theme</span>${seg('theme', [['dark', 'Dark'], ['light', 'Light']], Prefs.get('theme', 'dark'))}</div>
    <div class="ap-row"><span>Table felt</span>${sw('felt', Theme.FELTS)}</div>
    <div class="ap-row"><span>Card backs</span>${sw('cardBack', Theme.BACKS)}</div>
    <div class="ap-row"><span>Table rail</span>${sw('rail', Theme.RAILS)}</div>
    <div class="ap-row"><span>Card style</span>${pills('cardFace', Theme.FACES)}</div>
    <div class="ap-row"><span>Back pattern</span>${pills('backPattern', Theme.PATTERNS)}</div>
    <div class="ap-row"><span>Animations</span>${pills('anim', Motion.LEVELS)}<span class="hint" style="font-weight:400">Full: chips slide into the pot and out to the winner, cards are dealt from the middle and flip over. Simple: lighter effects. Off: nothing moves.</span></div>
    <div class="ap-row"><span>Sound pack</span>${pills('soundPack', Sound.PACKS)}
      <div class="ap-sound"><button type="button" class="btn sm" id="ap-play">${icon('play')}Preview</button><label class="ap-vol">${icon('sound')}<input type="range" id="ap-vol" min="0" max="100" step="5" value="${Sound.volume}" aria-label="Volume"></label><label class="check"><input type="checkbox" id="ap-mute" ${Sound.muted ? 'checked' : ''}> Mute</label></div></div>
    <label class="check"><input type="checkbox" id="ap-4c" ${Prefs.get('fourColor', false) ? 'checked' : ''}> Four-color deck (blue diamonds, green clubs)</label>
    <p class="hint">Saved in this browser only. Other players see their own choices.</p>
    <div class="modal-foot"><button class="btn" id="ap-reset">Reset to default</button><button class="btn primary" data-close>Done</button></div>`, { label: 'Appearance' });
  const sync = () => {
    Theme.apply();
    $$('[data-theme-toggle]').forEach((x) => { x.innerHTML = Theme.icon(); });
    $$('[data-ap]', m.el).forEach((g) => {
      const key = g.dataset.ap;
      const cur = key === 'theme' ? Prefs.get('theme', 'dark') : Theme.pick(key, { felt: Theme.FELTS, cardBack: Theme.BACKS, rail: Theme.RAILS, cardFace: Theme.FACES, backPattern: Theme.PATTERNS, anim: Motion.LEVELS, soundPack: Sound.PACKS }[key]);
      $$('[data-v]', g).forEach((b) => { b.setAttribute('aria-checked', String(b.dataset.v === cur)); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(b.dataset.v === cur)); });
    });
    $('#ap-4c', m.el).checked = Prefs.get('fourColor', false);
  };
  m.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ap] [data-v]');
    if (b) {
      const key = b.closest('[data-ap]').dataset.ap;
      Prefs.set(key, b.dataset.v);
      sync();
      if (key === 'soundPack') Sound.preview(b.dataset.v);
    }
  });
  $('#ap-play', m.el).addEventListener('click', () => Sound.preview(Sound.pack));
  $('#ap-vol', m.el).addEventListener('change', (e) => { Prefs.set('volume', Number(e.target.value)); Sound.preview(Sound.pack); });
  $('#ap-mute', m.el).addEventListener('change', (e) => { Prefs.set('muted', e.target.checked); $$('#g-sound').forEach((x) => { x.innerHTML = e.target.checked ? icon('mute') : icon('sound'); }); });
  $('#ap-4c', m.el).addEventListener('change', (e) => { Prefs.set('fourColor', e.target.checked); sync(); });
  $('#ap-reset', m.el).addEventListener('click', () => { ['felt', 'cardBack', 'rail', 'bigPrint', 'cardFace', 'backPattern', 'fourColor', 'anim', 'soundPack', 'volume'].forEach((k) => Prefs.del(k)); $('#ap-vol', m.el).value = Sound.volume; sync(); });
}

/** Setup screens: the rake cap only matters once a rake is chosen. */
function showRakeCap(root) {
  const on = Number(($('[data-seg="rakePct"] [aria-pressed="true"]', root) || {}).dataset?.v || 0) > 0;
  $$('.rake-cap', root).forEach((e) => e.classList.toggle('hidden', !on));
}

/** Lets a player erase everything Feltroom remembers in this browser. */
function wipeModal() {
  const s = Prefs.summary();
  const items = [
    s.name ? `Your saved name (<b>${U.esc(s.name)}</b>)` : 'Your saved name',
    'Your last table settings',
    `Links that let you rejoin a game in your old seat${s.tokens ? ` (${s.tokens})` : ''}`,
    `Saved game records and the viewer's last record${s.records ? ` (${s.records})` : ''}`,
  ];
  const m = openModal(`<h2>Clear my data</h2>
    <p class="muted" style="margin-top:0">Feltroom keeps a few things in this browser only. Nothing is stored on any server. Clearing removes:</p>
    <ul style="margin:0 0 12px;padding-left:20px;line-height:1.7">${items.map((x) => `<li>${x}</li>`).join('')}</ul>
    <label class="check"><input type="checkbox" id="w-display" checked> Keep my display preferences (theme, table and card colours, sound)</label>
    <p class="hint">Copy any game records you want to keep first. This cannot be undone.</p>
    <div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn danger" id="w-go">Clear my data</button></div>`, { label: 'Clear my data' });
  $('#w-go', m.el).addEventListener('click', () => {
    if (App.session) { try { App.session.leave(); } catch { /* ignore */ } App.session = null; }
    Prefs.wipe($('#w-display', m.el).checked);
    m.close();
    Theme.apply();
    toast('Your data on this device has been cleared.', 'success');
    route(true);
  });
}

/* ---------- Host setup ---------- */
function HostSetupScreen() {
  document.title = TitleFlash.base = 'Host a game · Feltroom';
  const d = Object.assign({ tableName: 'Friday Night Game', name: Prefs.get('name', ''), sb: 1, bb: 2, ante: 0, startingStack: 200, maxSeats: 9, timer: 30, rebuys: true, maxRebuys: 0, recordHole: 'All', game: 'holdem', limit: 'nl', levelHands: 0, hostPlays: true, sra: true }, Prefs.get('lastSettings', {}));
  d.name = Prefs.get('name', d.name || '');
  const seg = (name, opts, val) => `<div class="seg" role="radiogroup" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" role="radio" data-v="${v}" aria-pressed="${String(v) === String(val)}" aria-checked="${String(v) === String(val)}">${l}</button>`).join('')}</div>`;
  App.root.innerHTML = `<div class="page"><div class="page-inner">
    <div class="page-head"><a class="btn ghost icon-btn" href="#/" aria-label="Back to home">${icon('back')}</a><h2>Host a game</h2><span class="grow"></span>${topIconButtons()}</div>
    <form id="setup" novalidate>
      <div class="setup-grid">
        <section class="card-ui setup-section" style="grid-column:1/-1"><h3>Game</h3>
          <div class="two">
            <div class="field"><span>Game</span>${seg('game', [['holdem', "Texas Hold'em"], ['omaha4', 'Omaha'], ['omaha5', '5-Card Omaha']], d.game)}</div>
            <div class="field"><span>Betting</span>${seg('limit', [['nl', 'No limit'], ['pl', 'Pot limit'], ['fl', 'Limit']], d.limit)}</div>
          </div>
          <p class="hint" style="margin:0" id="game-hint"></p>
        </section>
        <section class="card-ui setup-section"><h3>Table</h3>
          <label class="field"><span>Table name</span><input class="input" name="tableName" maxlength="40" value="${U.esc(d.tableName)}" required></label>
          <label class="field"><span>Your display name</span><input class="input" name="name" maxlength="18" value="${U.esc(d.name)}" placeholder="e.g. Alice" required autocomplete="off"></label>
          <div class="field"><span>Max seats</span>${seg('maxSeats', [2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, n]), d.maxSeats)}</div>
        </section>
        <section class="card-ui setup-section"><h3>Stakes</h3>
          <div class="two"><label class="field"><span>Small blind</span><input class="input num" name="sb" type="number" min="1" step="1" inputmode="numeric" value="${d.sb}"></label>
          <label class="field"><span>Big blind</span><input class="input num" name="bb" type="number" min="1" step="1" inputmode="numeric" value="${d.bb}"></label></div>
          <div class="two"><label class="field"><span>Ante (optional)</span><input class="input num" name="ante" type="number" min="0" step="1" inputmode="numeric" value="${d.ante}"></label>
          <label class="field"><span>Starting stack</span><input class="input num" name="startingStack" type="number" min="2" step="1" inputmode="numeric" value="${d.startingStack}"></label></div>
          <div class="field"><span>Blinds go up</span>${seg('levelHands', [[0, 'Never'], [10, 'Every 10 hands'], [20, '20'], [30, '30']], d.levelHands)}</div>
          <div class="field"><span>Rake (the house takes a share of each pot)</span>${seg('rakePct', [[0, 'Off'], [2.5, '2.5%'], [5, '5%'], [10, '10%']], 0)}</div>
          <div class="field rake-cap hidden"><span>Rake cap (most taken from one pot)</span>${seg('rakeCap', [[0, 'No cap'], [1, '1 big blind'], [3, '3 big blinds'], [5, '5 big blinds']], 3)}</div>
          <p class="hint rake-cap hidden" style="margin:0">Only in hands that see a flop ("no flop, no drop"). The rake leaves the table, so everyone's chips shrink a little over time, like in a casino.</p>
        </section>
        <section class="card-ui setup-section"><h3>Pace</h3>
          <div class="field"><span>Action timer</span>${seg('timer', [[0, 'Off'], [15, '15s'], [30, '30s'], [60, '60s']], d.timer)}</div>
          <div class="field"><span>Rebuys when a player busts</span>${seg('rebuys', [['no', 'None'], [1, '1 each'], [2, '2 each'], [3, '3 each'], ['any', 'Unlimited']], !d.rebuys ? 'no' : d.maxRebuys ? d.maxRebuys : 'any')}</div>
        </section>
        <section class="card-ui setup-section"><h3>Fair play</h3>
          <label class="check"><input type="checkbox" name="hostPlays" ${d.hostPlays !== false ? 'checked' : ''}> I'm playing too (take a seat)</label>
          <label class="check"><input type="checkbox" name="sra" ${d.sra !== false ? 'checked' : ''}> Encrypted deal (recommended)</label>
          <label class="check"><input type="checkbox" name="botTakeover"> Bots replace disconnected players</label>
          <p class="hint" style="margin:0" id="fair-hint"></p>
        </section>
<section class="card-ui setup-section"><h3>Host controls</h3>
          <label class="check"><input type="checkbox" name="hostAdjust"> Host can change players' chip stacks</label>
          <label class="check"><input type="checkbox" name="hostKick"> Host can remove players from the table</label>
          <p class="hint" style="margin:0">Both off by default, so nobody's chips can be edited and nobody can be thrown out mid-game. Turn them on only if your group wants the host to have these powers. Either way, the table's log notes every change.</p>
        </section>
        <section class="card-ui setup-section"><h3>Waiting Room</h3>
          <label class="check"><input type="checkbox" name="listed"> List this table in the public Waiting Room</label>
          <p class="hint" style="margin:0">Off by default. When on, anyone browsing the <b>Waiting Room</b> can see this table's name, your name, the game and stakes and how many seats are free, and can join it${''} (or watch, if viewers are allowed). Your invite links keep working as usual. The listing disappears when the game ends.</p>
        </section>
        <section class="card-ui setup-section"><h3>Viewers</h3>
          <label class="check"><input type="checkbox" name="spectators"> Allow viewers with a watch-only link</label>
          <label class="check sub"><input type="checkbox" name="viewerChat" disabled> Viewers can post in the chat</label>
          <p class="hint" style="margin:0">Off by default. When on, you get a separate <b>viewer link</b> (in the ⋯ menu) that you can send at any time. Viewers see the table, bets and chat, but <b>never anyone's hole cards</b> (only hands turned face up at showdown), and they can't sit down or play.</p>
        </section>
        <section class="card-ui setup-section"><h3>Game record</h3>
          <div class="field"><span>Record hole cards</span>${seg('recordHole', [['All', 'All cards'], ['Showdown', 'Only cards shown at showdown']], d.recordHole)}</div>
          <p class="hint" style="margin:0">"All cards" reveals every player's hole cards in everyone's record once each hand is over. Hole cards are never sent to other players during a hand.</p>
        </section>
      </div>
      <div id="setup-err" class="err-box hidden" role="alert" style="margin-top:16px"></div>
      <div class="setup-foot"><span class="hint">Free PeerJS broker · no account needed</span><button class="btn primary lg" id="create">Create table</button></div>
    </form></div></div>`;
  bindThemeToggles(App.root);
  $$('[data-seg]', App.root).forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', g).forEach((x) => { x.setAttribute('aria-pressed', String(x === b)); x.setAttribute('aria-checked', String(x === b)); });
    if (g.dataset.seg === 'rakePct') showRakeCap(App.root);
  }));
  const form = $('#setup');
  const fairHint = () => {
    $('#fair-hint').innerHTML = form.sra.checked
      ? 'Every player\'s browser locks and shuffles the deck with its own secret key, so <b>nobody can see anyone else\'s cards, not even this device</b>. Each deal takes a second or two, and if a player leaves in the middle of a hand, that hand is cancelled and the chips go back.'
      : 'Standard deal: a <b>provably fair shuffle</b> that every player\'s browser checks. This device sees every hole card while dealing, so if you play too, other players have to trust you.';
  };
  form.sra.addEventListener('change', () => { if (form.sra.checked) form.botTakeover.checked = false; fairHint(); });
  bindViewerOptions(form);
  fairHint();
  // Off by default, and turning it on asks for confirmation.
  form.botTakeover.addEventListener('change', (e) => {
    if (!e.target.checked) return;
    e.target.checked = false;
    const m = openModal(`<h2>${icon('bot')} Let bots replace disconnected players?</h2>
      <p>If a player drops out, a bot makes their decisions using <b>their chips</b> until they reconnect. Wins and losses the bot makes count for that player.</p>
      <p class="muted">Hands in which a bot acts are <b>left out of the player-only game record</b>. They appear only in the full record, marked with a [Bots] tag. Both can be copied from the table menu.</p>
      ${form.sra.checked ? '<p class="muted"><b>This turns off the encrypted deal.</b> A bot playing for someone needs to see their cards, which only works when this device deals.</p>' : ''}
      <div class="modal-foot"><button class="btn" data-close>Keep it off</button><button class="btn primary" id="bt-on">Turn it on</button></div>`, { label: 'Bot takeover' });
    $('#bt-on', m.el).addEventListener('click', () => { form.botTakeover.checked = true; form.sra.checked = false; fairHint(); m.close(); });
  });
  const hint = () => {
    const g = $('[data-seg="game"] [aria-pressed="true"]').dataset.v, l = $('[data-seg="limit"] [aria-pressed="true"]').dataset.v;
    $('#game-hint').textContent = (g === 'holdem' ? 'Two hole cards; make the best five-card hand from any of your cards and the board.'
      : `${g === 'omaha5' ? 'Five' : 'Four'} hole cards; your hand must use exactly two of them plus exactly three from the board.`)
      + (l === 'pl' ? ' Pot limit: the biggest bet or raise is the size of the pot.' : l === 'fl' ? ' Limit: every bet and raise is a fixed size (one big blind preflop and on the flop, two on the turn and river), with at most four bets per round.' : ' No limit: bet any amount up to your whole stack.');
  };
  $$('[data-seg="game"], [data-seg="limit"]').forEach((g) => g.addEventListener('click', () => setTimeout(hint)));
  hint();
  if (!d.name) setTimeout(() => form.name.focus(), 50);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const segv = (n) => $(`[data-seg="${n}"] [aria-pressed="true"]`).dataset.v;
    const s = {
      tableName: form.tableName.value.replace(/["\[\]\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Home Game',
      sb: Math.floor(Number(form.sb.value)), bb: Math.floor(Number(form.bb.value)), ante: Math.floor(Number(form.ante.value || 0)),
      startingStack: Math.floor(Number(form.startingStack.value)), maxSeats: Number(segv('maxSeats')), timer: Number(segv('timer')),
      rebuys: segv('rebuys') !== 'no', maxRebuys: ['no', 'any'].includes(segv('rebuys')) ? 0 : Number(segv('rebuys')), recordHole: segv('recordHole'),
      game: segv('game'), limit: segv('limit'), levelHands: Number(segv('levelHands')), rakePct: Number(segv('rakePct')), rakeCap: Number(segv('rakeCap')), hostPlays: form.hostPlays.checked, botTakeover: form.botTakeover.checked && !form.sra.checked, sra: form.sra.checked,
      spectators: form.spectators.checked, viewerChat: form.spectators.checked && form.viewerChat.checked, listed: form.listed.checked,
      hostAdjust: form.hostAdjust.checked, hostKick: form.hostKick.checked,
    };
    const name = U.sanitizeName(form.name.value);
    const errs = [];
    if (!name) errs.push('Enter your display name.');
    if (!(s.sb >= 1)) errs.push('Small blind must be at least 1.');
    if (!(s.bb >= s.sb)) errs.push('Big blind must be at least the small blind.');
    if (!(s.ante >= 0)) errs.push('Ante cannot be negative.');
    if (!(s.startingStack >= s.bb * 2)) errs.push('Starting stack must be at least two big blinds.');
    if (s.game === 'omaha5' && s.maxSeats > 8) errs.push('5-Card Omaha seats at most 8 players (a deck has only 52 cards).');
    if (s.startingStack > 10000000) errs.push('Starting stack is too large.');
    const box = $('#setup-err');
    if (errs.length) { box.innerHTML = `${icon('alert')}<div>${errs.map(U.esc).join('<br>')}</div>`; box.classList.remove('hidden'); return; }
    box.classList.add('hidden');
    // The viewer options are deliberately not remembered: they start switched off for every new table.
    const { spectators, viewerChat, listed, hostAdjust, hostKick, rakePct, rakeCap, ...remember } = s; void spectators; void viewerChat; void listed; void hostAdjust; void hostKick; void rakePct; void rakeCap;
    Prefs.set('lastSettings', remember); Prefs.set('name', name);
    await startHosting(s, name);
  });
  return {};
}

/** "Viewers can chat" only makes sense when viewers are allowed. */
function bindViewerOptions(form) {
  const sync = () => { form.viewerChat.disabled = !form.spectators.checked; if (!form.spectators.checked) form.viewerChat.checked = false; };
  form.spectators.addEventListener('change', sync);
  sync();
}

/* ---------- Play vs Bots setup ---------- */
function BotSetupScreen() {
  document.title = TitleFlash.base = 'Play vs Bots · Feltroom';
  const d = Object.assign({ name: Prefs.get('name', ''), bots: 5, difficulty: 'intermediate', personality: 'mixed', game: 'holdem', limit: 'nl', sb: 1, bb: 2, ante: 0, startingStack: 200, levelHands: 0, rebuys: 'any', botSpeed: 'normal', timer: 0 }, Prefs.get('botSettings', {}));
  const seg = (name, opts, val) => `<div class="seg" role="radiogroup" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" role="radio" data-v="${v}" aria-pressed="${String(v) === String(val)}" aria-checked="${String(v) === String(val)}">${l}</button>`).join('')}</div>`;
  App.root.innerHTML = `<div class="page"><div class="page-inner">
    <div class="page-head"><a class="btn ghost icon-btn" href="#/" aria-label="Back to home">${icon('back')}</a><h2>Play vs Bots</h2><span class="grow"></span>${topIconButtons()}</div>
    <form id="bsetup" novalidate><div class="setup-grid">
      <section class="card-ui setup-section" style="grid-column:1/-1"><h3>Opponents</h3>
        <div class="field"><span>Number of bots</span>${seg('bots', [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [n, n]), d.bots)}</div>
        <div class="field"><span>Difficulty</span>${seg('difficulty', Object.keys(Bots.PROFILES).map((k) => [k, Bots.LABELS[k]]), d.difficulty)}</div>
        <p class="hint" style="margin:0" id="diff-hint"></p>
        <p class="hint" style="margin:0">Every bot gets its own version of its play style and its mood drifts from hand to hand, so a label is a tendency, not a script.</p>
        <div class="two">
          <label class="field"><span>Play style</span><select class="input" name="personality"><option value="mixed">Mixed (a different style at every seat)</option>${Object.entries(Bots.PERSONALITIES).map(([k, v]) => `<option value="${k}" ${d.personality === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select></label>
          <div class="field"><span>Bot speed</span>${seg('botSpeed', BOT_SPEEDS, d.botSpeed)}</div>
          <p class="hint">Instant plays hands as fast as your device can, with auto-play on for you (call, check, bet the minimum, rebuy). The table updates a few times a second; stop auto-play to take over.</p>
        </div>
      </section>
      <section class="card-ui setup-section"><h3>You</h3>
        <label class="field"><span>Your name</span><input class="input" name="name" maxlength="18" value="${U.esc(d.name)}" placeholder="e.g. Alice" autocomplete="off"></label>
        <div class="field"><span>Game</span>${seg('game', [['holdem', "Hold'em"], ['omaha4', 'Omaha'], ['omaha5', '5-Card Omaha']], d.game)}</div>
        <div class="field"><span>Betting</span>${seg('limit', [['nl', 'No limit'], ['pl', 'Pot limit'], ['fl', 'Limit']], d.limit)}</div>
      </section>
      <section class="card-ui setup-section"><h3>Stakes</h3>
        <div class="two"><label class="field"><span>Small blind</span><input class="input num" name="sb" type="number" min="1" value="${d.sb}"></label><label class="field"><span>Big blind</span><input class="input num" name="bb" type="number" min="1" value="${d.bb}"></label></div>
        <div class="two"><label class="field"><span>Ante</span><input class="input num" name="ante" type="number" min="0" value="${d.ante}"></label><label class="field"><span>Starting stack</span><input class="input num" name="startingStack" type="number" min="2" value="${d.startingStack}"></label></div>
        <div class="field"><span>Blinds go up</span>${seg('levelHands', [[0, 'Never'], [10, 'Every 10 hands'], [20, '20'], [30, '30']], d.levelHands)}</div>
        <div class="field"><span>Rebuys (bots rebuy automatically)</span>${seg('rebuys', [['no', 'None'], [1, '1 each'], [3, '3 each'], ['any', 'Unlimited']], d.rebuys)}</div>
        <div class="field"><span>Rake (the house takes a share of each pot)</span>${seg('rakePct', [[0, 'Off'], [2.5, '2.5%'], [5, '5%'], [10, '10%']], 0)}</div>
        <div class="field rake-cap hidden"><span>Rake cap (most taken from one pot)</span>${seg('rakeCap', [[0, 'No cap'], [1, '1 big blind'], [3, '3 big blinds'], [5, '5 big blinds']], 3)}</div>
        <p class="hint rake-cap hidden" style="margin:0">Only in hands that see a flop ("no flop, no drop"). The rake leaves the table, so everyone's chips shrink a little over time, like in a casino.</p>
      </section>
      <section class="card-ui setup-section" style="grid-column:1/-1"><h3>Extras</h3>
        <div class="two">
          <div style="display:flex;flex-direction:column;gap:8px">
            <label class="check"><input type="checkbox" name="botChat"> Bots cheer you on in the chat</label>
            <p class="hint" style="margin:0">Corny, encouraging table talk from the bots ("Believe in the river! 🌊"). Off by default.</p>
            <label class="check"><input type="checkbox" name="hostAdjust"> I can change chip stacks (mine and the bots')</label>
            <label class="check"><input type="checkbox" name="hostKick"> I can remove bots from the table</label>
            <p class="hint" style="margin:0">Both off by default: the game plays out with the chips and bots it started with.</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <label class="check"><input type="checkbox" name="spectators"> Allow viewers with a watch-only link</label>
            <label class="check sub"><input type="checkbox" name="viewerChat" disabled> Viewers can post in the chat</label>
            <p class="hint" style="margin:0">Off by default. Friends can watch your practice game from their own device but never see your hole cards. Needs an internet connection for the link.</p>
          </div>
        </div>
      </section>
    </div>
    <div id="bsetup-err" class="err-box hidden" role="alert" style="margin-top:16px"></div>
    <div class="setup-foot"><span class="hint">Runs entirely on this device · no internet needed once loaded</span><button class="btn primary lg">${icon('play')}Deal me in</button></div>
    </form></div></div>`;
  bindThemeToggles(App.root);
  $$('[data-seg]', App.root).forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', g).forEach((x) => { x.setAttribute('aria-pressed', String(x === b)); x.setAttribute('aria-checked', String(x === b)); });
    if (g.dataset.seg === 'rakePct') showRakeCap(App.root);
    hint();
  }));
  const segv = (n) => $(`[data-seg="${n}"] [aria-pressed="true"]`).dataset.v;
  const HINTS = {
    beginner: 'Plays on raw hand strength, ignores position and calls too much. It has tells: big bets usually mean a big hand.',
    casual: 'Adds pot odds and some position awareness, and starts to notice when your bets mean strength. Still loose and readable.',
    intermediate: 'Simulates its chances against the hands you could really have, reads your bet sizes, defends sensibly and goes all-in or folds when short-stacked.',
    advanced: 'Reads lines such as check-raises, donk bets and three barrels, and uses bet sizes that do not give its hand away.',
    professional: 'Adds an opponent model: how often you fold to small and big bets, and how often your river bets were bluffs at showdown.',
    elite: 'Deeper simulations, blockers and sharper exploits of what it has learned about you.',
    extreme: 'The strongest: the deepest simulations, balanced bluffs and sizes, and the most careful reads.',
  };
  const hint = () => { $('#diff-hint').textContent = HINTS[segv('difficulty')] || ''; };
  hint();
  bindViewerOptions($('#bsetup'));
  $('#bsetup').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const name = U.sanitizeName(f.name.value) || 'You';
    const s = {
      tableName: 'Practice vs Bots', sb: Math.floor(+f.sb.value), bb: Math.floor(+f.bb.value), ante: Math.floor(+f.ante.value || 0),
      startingStack: Math.floor(+f.startingStack.value), game: segv('game'), limit: segv('limit'), levelHands: +segv('levelHands'), rakePct: +segv('rakePct'), rakeCap: +segv('rakeCap'),
      rebuys: segv('rebuys') !== 'no', maxRebuys: ['no', 'any'].includes(segv('rebuys')) ? 0 : +segv('rebuys'),
      timer: 0, recordHole: 'All', botSpeed: segv('botSpeed'),
      botChat: f.botChat.checked, spectators: f.spectators.checked, viewerChat: f.spectators.checked && f.viewerChat.checked,
      hostAdjust: f.hostAdjust.checked, hostKick: f.hostKick.checked,
    };
    const nBots = +segv('bots'), errs = [];
    if (!(s.sb >= 1 && s.bb >= s.sb)) errs.push('Big blind must be at least the small blind (and both at least 1).');
    if (!(s.startingStack >= s.bb * 2)) errs.push('Starting stack must be at least two big blinds.');
    if (s.game === 'omaha5' && nBots > 7) errs.push('5-Card Omaha seats at most 8 players.');
    const box = $('#bsetup-err');
    if (errs.length) { box.innerHTML = `${icon('alert')}<div>${errs.join('<br>')}</div>`; box.classList.remove('hidden'); return; }
    s.maxSeats = nBots + 1;
    Prefs.set('botSettings', { bots: nBots, difficulty: segv('difficulty'), personality: f.personality.value, game: s.game, limit: s.limit, sb: s.sb, bb: s.bb, ante: s.ante, startingStack: s.startingStack, levelHands: s.levelHands, rebuys: segv('rebuys'), botSpeed: savedSpeed(s.botSpeed, 'botSettings') });
    Prefs.set('name', name);
    const styles = Object.keys(Bots.PERSONALITIES);
    const names = Cards.shuffle(Bots.NAMES.slice());
    const bots = Array.from({ length: nBots }, (_, i) => ({
      name: names[i], difficulty: segv('difficulty'),
      personality: f.personality.value === 'mixed' ? styles[U.randInt(styles.length)] : f.personality.value,
    }));
    const sess = new BotSession(s, name, bots).start();
    App.session = sess;
    App.screen = GameScreen(sess);
  });
  return {};
}

/* Play Against Cepheus: heads-up fixed-limit Hold'em against the CFR+ opponent. */
function CepheusScreen() {
  document.title = TitleFlash.base = 'Play Against Cepheus · Feltroom';
  const d = Object.assign({ name: Prefs.get('name', ''), botSpeed: 'normal' }, Prefs.get('cepheusSettings', {}));
  const C = CepheusBot;
  App.root.innerHTML = `<div class="page"><div class="page-inner">
    <div class="page-head"><a class="btn ghost icon-btn" href="#/" aria-label="Back to home">${icon('back')}</a><h2>Play Against Cepheus</h2><span class="grow"></span>${topIconButtons()}</div>
    <form id="csetup" novalidate><div class="setup-grid">
      <section class="card-ui setup-section" style="grid-column:1/-1"><h3>What you are playing</h3>
        <p style="margin:0">In 2015 the University of Alberta's <b>Cepheus</b> essentially solved heads-up limit Texas Hold'em with an algorithm called <b>CFR+</b>. Cepheus's finished strategy is more than 10 terabytes and was never published, so it cannot run in a web page.</p>
        <p style="margin:0">This opponent uses the same CFR+ algorithm, from the code the Cepheus team released, solved on <b>exactly the same game</b>. To fit in a ${U.esc(C.sizeLabel)} file it groups similar hands together (169 starting hands, then 50 strength groups on each later street). On the <b>river</b> it goes further: it solves the exact spot during play, over every hand either player could hold, instead of using the groups. It is a strong, randomised equilibrium-style player, but it is <b>an approximation of Cepheus, not Cepheus's own strategy</b>.</p>
        <p class="hint" style="margin:0">It decides using only what a real player sees: its own two cards, the board and the betting. It never sees your cards or the cards still to come.</p>
        <p class="hint" style="margin:0">Feltroom is not affiliated with or endorsed by the University of Alberta or the Cepheus team. The CFR+ code and hand-ranking tables are used under their open licence (see <a href="cepheus/LICENCE-CFR_plus.txt" target="_blank" rel="noopener">licence</a>).</p>
      </section>
      <section class="card-ui setup-section"><h3>You</h3>
        <label class="field"><span>Your name</span><input class="input" name="name" maxlength="18" value="${U.esc(d.name)}" placeholder="e.g. Alice" autocomplete="off"></label>
        <div class="field"><span>Cepheus's speed</span><div class="seg" role="radiogroup" data-seg="botSpeed">${BOT_SPEEDS.map(([v, l]) => `<button type="button" role="radio" data-v="${v}" aria-pressed="${v === d.botSpeed}" aria-checked="${v === d.botSpeed}">${l}</button>`).join('')}</div></div>
      </section>
      <section class="card-ui setup-section"><h3>The game (Cepheus's rules)</h3>
        <ul class="hint" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">
          <li>Heads-up fixed-limit Texas Hold'em, blinds ${C.SB}/${C.BB}. The button posts the small blind and acts first before the flop.</li>
          <li>Bets and raises are ${C.BB} before the flop and on the flop, ${C.BB * 2} on the turn and river.</li>
          <li>At most 4 bets per round (before the flop the big blind counts as the first).</li>
          <li>Both stacks reset to ${U.fmt(C.STACK)} at the start of every hand, so nobody is ever all-in; your running result is kept in the player list.</li>
        </ul>
      </section>
    </div>
    <div id="csetup-err" class="err-box hidden" role="alert" style="margin-top:16px"></div>
    <div class="setup-foot"><span class="hint" id="csetup-status">Downloads the engine and strategy (${U.esc(C.sizeLabel)}) the first time</span><button class="btn primary lg" id="c-start">${icon('play')}Play Cepheus</button></div>
    </form></div></div>`;
  bindThemeToggles(App.root);
  $$('[data-seg]', App.root).forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', g).forEach((x) => { x.setAttribute('aria-pressed', String(x === b)); x.setAttribute('aria-checked', String(x === b)); });
  }));
  const segv = (n) => $(`[data-seg="${n}"] [aria-pressed="true"]`).dataset.v;
  let gone = false;
  $('#csetup').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, btn = $('#c-start'), box = $('#csetup-err'), st = $('#csetup-status');
    const name = U.sanitizeName(f.name.value) || 'You';
    Prefs.set('name', name); Prefs.set('cepheusSettings', { botSpeed: savedSpeed(segv('botSpeed'), 'cepheusSettings') });
    box.classList.add('hidden'); btn.disabled = true;
    st.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:-2px"></span> Loading Cepheus…';
    try { await C.load(); }
    catch (err) {
      if (gone) return;
      btn.disabled = false; st.textContent = 'Nothing was started.';
      box.innerHTML = `${icon('alert')}<div><b>Cepheus could not be loaded.</b><br>${U.esc(err.message)}<br>Your other game modes are not affected.</div>`;
      box.classList.remove('hidden');
      return;
    }
    if (gone) return;
    const s = {
      tableName: 'Cepheus · CFR+ approximation', sb: C.SB, bb: C.BB, ante: 0, startingStack: C.STACK, game: 'holdem', limit: 'fl', levelHands: 0,
      rebuys: false, maxRebuys: 0, timer: 0, recordHole: 'All', botSpeed: segv('botSpeed'), maxSeats: 2,
      botChat: false, spectators: false, viewerChat: false, hostAdjust: false, hostKick: false, cepheus: true, resetStacks: true,
    };
    const sess = new BotSession(s, name, [{ name: 'Cepheus', difficulty: 'cepheus', personality: 'cfr', kind: 'cepheus' }]);
    sess.cepheus = true;
    App.session = sess.start();
    App.screen = GameScreen(sess);
  });
  return { destroy() { gone = true; } };
}

async function startHosting(s, name) {
  App.root.innerHTML = `<div class="page"><div class="center-card card-ui" style="margin:auto"><div class="spinner" aria-hidden="true"></div><h2>Opening your table…</h2><p class="muted">Registering with the free PeerJS broker.</p></div></div>`;
  try {
    const sess = new HostSession(s, name);
    await sess.start();
    App.session = sess;
    App.screen = GameScreen(sess);
  } catch (e) {
    showError(Net.friendly(e), () => startHosting(s, name), '#/host');
  }
}

function showError(err, retry, backHash = '#/') {
  App.root.innerHTML = `<div class="page"><div class="center-card card-ui" role="alert" style="margin:auto">
    <div class="state-ic err">${icon('wifi')}</div><h2>${U.esc(err.title)}</h2><p class="muted" style="margin:0">${U.esc(err.message)}</p>
    <div class="row" style="justify-content:center;flex-wrap:wrap"><a class="btn" href="${backHash}" id="err-back">Back</a><button class="btn primary" id="err-retry">Retry</button></div></div></div>`;
  $('#err-retry').addEventListener('click', retry);
  $('#err-back').addEventListener('click', (e) => { if (location.hash === backHash) { e.preventDefault(); route(true); } });
  $('#err-retry').focus();
}

/* ---------- Join ---------- */
function JoinScreen(hostId) {
  document.title = TitleFlash.base = "Join a game · Feltroom";
  const s = App.session;
  if (s && s.role === 'client' && s.id === hostId && !s.ended) { App.screen = GameScreen(s); return App.screen; }
  const token = Prefs.get('token.' + hostId, null), saved = Prefs.get('name', '');
  // A refresh in the same tab reconnects straight away; a new tab offers "Rejoin" (or a fresh seat,
  // so two tabs in one browser can be two different players).
  let sameTab = false;
  try { sameTab = sessionStorage.getItem('feltroom.active') === hostId; } catch { /* ignore */ }
  const rejoinName = token ? Prefs.get('tokenName.' + hostId, saved) : '';
  const form = () => {
    App.root.innerHTML = `<div class="page"><div class="page-inner">
      <header class="row"><a class="brand" href="#/" style="text-decoration:none;color:inherit"><div class="logo" aria-hidden="true">♠</div><strong>Feltroom</strong></a><span class="grow"></span>${topIconButtons()}</header>
      <form class="center-card card-ui" id="join" style="margin:auto">
        <div class="state-ic">${icon('table')}</div>
        <h2>You're invited to a poker game</h2>
        <p class="muted" style="margin:0">No account needed. Pick a name and you're at the table.</p>
        ${rejoinName ? `<button type="button" class="btn primary lg" id="j-rejoin">Rejoin as ${U.esc(rejoinName)}</button><div class="hint">or join as a new player:</div>` : ''}
        <label class="field" style="text-align:left"><span>Your name</span><input class="input" name="name" maxlength="18" value="${rejoinName ? '' : U.esc(saved)}" placeholder="e.g. Bob" autocomplete="off" required></label>
        <div id="join-err" class="err-box hidden" role="alert"></div>
        <button class="btn ${rejoinName ? '' : 'primary'} lg">${rejoinName ? 'Join as new player' : 'Join game'}</button>
        <p class="hint" style="margin:0">Game <code>${U.esc(hostId)}</code> · Peer-to-peer via the free PeerJS broker</p>
      </form></div></div>`;
    bindThemeToggles(App.root);
    const f = $('#join');
    setTimeout(() => (rejoinName ? $('#j-rejoin') : saved ? f.querySelector('button.primary') : f.name).focus(), 50);
    if (rejoinName) $('#j-rejoin').addEventListener('click', () => connect(rejoinName, false));
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = U.sanitizeName(f.name.value);
      if (!name) { const b = $('#join-err'); b.innerHTML = `${icon('alert')}<div>Please enter a name (letters, numbers and spaces).</div>`; b.classList.remove('hidden'); return; }
      Prefs.set('name', name);
      connect(name, !!rejoinName);
    });
  };
  const connect = async (name, fresh, autoSit) => {
    App.root.innerHTML = `<div class="page"><div class="center-card card-ui" style="margin:auto"><div class="spinner" aria-hidden="true"></div><h2>Connecting to the host…</h2><p class="muted">Finding the game through the free PeerJS broker, then connecting directly.</p></div></div>`;
    const sess = new ClientSession(hostId, name, { fresh });
    try {
      await sess.connect();
      sess.autoSit = !!autoSit;
      App.session = sess;
      App.screen = GameScreen(sess);
    } catch (e) {
      try { sess.leave(); } catch { /* ignore */ }
      if (e && e.type === 'rejected') Prefs.del('token.' + hostId);
      const fr = Net.friendly(e);
      const rec = Prefs.get('record.' + hostId, '');
      showError(fr, () => connect(name, fresh), '#/');
      if (rec) {
        const b = document.createElement('button');
        b.className = 'btn'; b.textContent = 'Copy saved game record';
        b.addEventListener('click', () => copyText(rec, 'Game record copied'));
        $('.center-card .row').prepend(b);
      }
    }
  };
  // Accepted a rematch invitation: join straight away under the same name and take a seat.
  const auto = App.autoJoin; App.autoJoin = null;
  if (auto && auto.id === hostId) connect(auto.name, true, true);
  else if (token && sameTab) connect(rejoinName || saved, false); else form();
  return {};
}

/* ---------- Waiting Room: public tables ---------- */
function RoomsScreen() {
  document.title = TitleFlash.base = 'Waiting Room · Feltroom';
  document.body.classList.add('scroll');
  let alive = true, timer = null, scanning = false;
  App.root.innerHTML = `<div class="page"><div class="page-inner">
    <div class="page-head"><a class="btn ghost icon-btn" href="#/" aria-label="Back to home">${icon('back')}</a><h2>Waiting Room</h2><span class="grow"></span><button class="btn sm" id="r-refresh">${icon('history')}Refresh</button>${topIconButtons()}</div>
    <p class="muted" style="margin-top:0">Public tables that their hosts chose to list. Click <b>Join</b> to take a seat, or <b>Watch</b> where the host allows viewers. Want your own table here? Host a game and tick <b>List this table in the public Waiting Room</b>.</p>
    <div class="r-status" id="r-status"></div>
    <div class="r-list" id="r-list"></div>
  </div></div>`;
  bindThemeToggles(App.root);
  const list = $('#r-list'), status = $('#r-status');
  const card = (r) => {
    const free = r.max - r.seated, full = free <= 0;
    return `<article class="card-ui r-card">
      <div class="r-top">${avatarHtml(r.host)}<div class="r-id"><h3>${U.esc(r.name)}</h3><span class="muted">Hosted by ${U.esc(r.host)}</span></div>
        <span class="pill ${r.status === 'lobby' ? 'r-open' : ''}">${r.status === 'lobby' ? 'Waiting to start' : `Playing · hand ${r.hand}`}</span></div>
      <div class="r-facts"><span><b>${U.esc(r.variant || 'Poker')}</b></span><span>Blinds <b>${r.sb != null ? U.fmt(r.sb) : '?'}/${r.bb != null ? U.fmt(r.bb) : '?'}</b>${r.ante ? ` · ante ${U.fmt(r.ante)}` : ''}</span>
        ${r.stack != null ? `<span>Stack <b>${U.fmt(r.stack)}</b></span>` : ''}<span><b>${r.seated}/${r.max}</b> seated</span>${r.sra ? `<span>${icon('lock')}Encrypted deal</span>` : ''}</div>
      <div class="r-actions">${r.watchId ? `<a class="btn" href="#watch=${r.watchId}">${icon('eye')}Watch</a>` : ''}
        <a class="btn primary ${full ? 'disabled' : ''}" ${full ? 'aria-disabled="true"' : `href="#join=${r.joinId}"`}>${icon('play')}${full ? 'Table full' : 'Join'}</a></div>
    </article>`;
  };
  async function scan() {
    if (scanning || !alive) return;
    scanning = true;
    const found = [];
    status.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px"></div><span>Looking for tables…</span>`;
    const draw = () => {
      found.sort((a, b) => (a.status === 'lobby' ? 0 : 1) - (b.status === 'lobby' ? 0 : 1) || (b.max - b.seated) - (a.max - a.seated));
      list.innerHTML = found.map(card).join('');
    };
    try {
      await Rooms.scan((r) => { if (!alive) return; found.push(r); draw(); }, (n, total) => { if (alive) status.querySelector('span').textContent = `Looking for tables… (${n} of ${total} room slots checked)`; });
      if (!alive) return;
      draw();
      status.innerHTML = found.length
        ? `<span>${found.length} table${found.length === 1 ? '' : 's'} found · refreshes every 30 seconds</span>`
        : '';
      if (!found.length) list.innerHTML = `<div class="empty card-ui" style="padding:30px"><span class="e-ic">🪑</span><b>No public tables right now.</b><br>Be the first: <a href="#/host">host a game</a> and tick <i>List this table in the public Waiting Room</i>.</div>`;
    } catch (e) {
      if (!alive) return;
      const f = Net.friendly(e);
      status.innerHTML = '';
      list.innerHTML = `<div class="err-box">${icon('alert')}<div><b>${U.esc(f.title)}</b><br>${U.esc(f.message)}</div></div>`;
    } finally { scanning = false; }
    if (alive) { clearTimeout(timer); timer = setTimeout(scan, 30000); }
  }
  $('#r-refresh').addEventListener('click', () => { clearTimeout(timer); scan(); });
  scan();
  return { destroy() { alive = false; clearTimeout(timer); document.body.classList.remove('scroll'); } };
}

/* ---------- Viewer link: watch a table without playing ---------- */
function WatchScreen(watchId) {
  document.title = TitleFlash.base = 'Watch a game · Feltroom';
  const s = App.session;
  if (s && s.role === 'watcher' && s.id === watchId && !s.ended) { App.screen = GameScreen(s); return App.screen; }
  const saved = Prefs.get('name', '');
  App.root.innerHTML = `<div class="page"><div class="page-inner">
    <header class="row"><a class="brand" href="#/" style="text-decoration:none;color:inherit"><div class="logo" aria-hidden="true">♠</div><strong>Feltroom</strong></a><span class="grow"></span>${topIconButtons()}</header>
    <form class="center-card card-ui" id="watch" style="margin:auto">
      <div class="state-ic">${icon('eye')}</div>
      <h2>Watch a poker game</h2>
      <p class="muted" style="margin:0">You'll see the table, the board, the bets and the chat, but never anyone's hole cards (only hands turned face up at showdown).</p>
      <label class="field" style="text-align:left"><span>Your name (shown if the table lets viewers chat)</span><input class="input" name="name" maxlength="18" value="${U.esc(saved)}" placeholder="e.g. Sam" autocomplete="off"></label>
      <button class="btn primary lg">${icon('eye')}Start watching</button>
    </form></div></div>`;
  bindThemeToggles(App.root);
  const f = $('#watch');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = U.sanitizeName(f.name.value) || 'Viewer';
    App.root.innerHTML = `<div class="page"><div class="center-card card-ui" style="margin:auto"><div class="spinner" aria-hidden="true"></div><h2>Connecting to the table…</h2><p class="muted">Finding the game through the free PeerJS broker.</p></div></div>`;
    const sess = new ClientSession(watchId, name, { watch: true });
    try { await sess.connect(); App.session = sess; App.screen = GameScreen(sess); }
    catch (err) { try { sess.leave(); } catch { /* ignore */ } showError(Net.friendly(err), () => route(true), '#/'); }
  });
  return {};
}

/** The viewer link with a QR code (anyone can open it at any point in the game). */
async function viewerLinkModal(url) {
  if (!url) return toast('The viewer link is still connecting. Try again in a moment.', 'info');
  if (!(await copyText(url, 'Viewer link copied to your clipboard'))) return;
  const m = openModal(`<h2>${icon('eye')} Viewer link</h2><p class="muted" style="margin-top:0">Send this to anyone who wants to watch. Viewers see the table and the chat but never anyone's hole cards, and they can't sit down or play. You can share it at any time during the game.</p>
    <div class="invite-link" style="margin-bottom:14px">${U.esc(url)}</div>
    <div class="qr">${QR.svg(url)}</div>
    <div class="modal-foot"><button class="btn" data-close>Close</button><button class="btn primary" id="m-copywatch">${icon('copy')}Copy viewer link</button></div>`, { label: 'Viewer link' });
  $('#m-copywatch', m.el).addEventListener('click', () => copyText(url, 'Viewer link copied'));
}

/* ---------- Live table ---------- */
/** Bot speeds. Instant plays with no pauses at all and turns auto-play on; it is never remembered for next time. */
const BOT_SPEEDS = [['instant', 'Instant'], ['ultra', 'Ultra fast'], ['fast', 'Fast'], ['normal', 'Normal'], ['slow', 'Slow']];
const speedName = (v) => (BOT_SPEEDS.find((x) => x[0] === v) || BOT_SPEEDS[3])[1];
const savedSpeed = (v, key) => (v === 'instant' ? Prefs.get(key, {}).botSpeed || 'normal' : v);

function GameScreen(session) {
  const isHost = session.role === 'host';
  const isWatcher = session.role === 'watcher';
  const mobile = () => Device.mobile || matchMedia('(max-width: 900px)').matches;
  App.root.innerHTML = `<div class="game">
    <header class="topbar">
      <div class="brand"><div class="logo" aria-hidden="true">♠</div><div style="min-width:0"><div class="t-name" id="g-name">Table</div><div class="t-sub" id="g-sub"></div></div></div>
      <div class="top-actions">
        ${session.offline || isWatcher ? '' : `<button class="btn sm ghost" id="g-fair" aria-label="Fair play status">${icon('shield')}<span class="hide-sm">Fair play</span></button>
        <button class="btn sm hide-sm" id="g-invite">${icon('link')}<span>Invite</span></button>`}
        ${isWatcher ? `<span class="pill watching-pill">${icon('eye')}<span class="hide-sm">Watching</span></span>` : ''}
        <button class="btn sm ghost hidden" id="g-watchlink" aria-label="Viewer link">${icon('eye')}<span class="hide-sm">Viewer link</span></button>
        ${isWatcher ? '<span id="g-copy" hidden></span>' : `<button class="btn sm ghost hide-sm" id="g-copy">${icon('copy')}<span>Copy Game Record</span></button>`}
        ${isHost ? `<button class="btn sm ghost hidden" id="g-pause"></button>` : ''}
        <button class="btn ghost icon-btn" data-appearance aria-label="Appearance: felt, cards and theme" title="Appearance">${icon('palette')}</button>
        <button class="btn ghost icon-btn" id="g-sound"></button>
        <button class="btn ghost icon-btn hide-sm" data-theme-toggle aria-label="Toggle light or dark theme">${Theme.icon()}</button>
        <button class="btn ghost icon-btn hide-sm" id="g-help" aria-label="Keyboard shortcuts">${icon('help')}</button>
        <button class="btn ghost icon-btn only-m" id="g-chatbtn" aria-label="Open chat">${icon('chat')}<span class="badge hidden" id="g-chatbadge"></span></button>
        <button class="btn ghost icon-btn" id="g-panel" aria-label="Show log, chat and players" aria-expanded="false">${icon('panel')}<span class="badge hidden" id="g-badge"></span></button>
        <button class="btn ghost icon-btn" id="g-menu" aria-label="More options" aria-haspopup="true">${icon('more')}</button>
      </div>
    </header>
    <div class="game-body">
      <div class="table-area">
        <aside class="lobby hidden" id="g-lobby" aria-label="Lobby"></aside>
        <div class="table-stage" id="g-stage"><div class="banner hidden" id="g-banner" role="status"></div><div class="chat-feed" id="g-feed" aria-live="polite" aria-label="Recent chat"></div></div>
      </div>
      <aside class="side" id="g-side" aria-label="Log, chat and players">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" data-tab="log" aria-selected="true">Log</button>
          <button class="tab" role="tab" data-tab="chat" aria-selected="false">Chat<span class="dot hidden" id="g-chatdot"></span></button>
          <button class="tab" role="tab" data-tab="players" aria-selected="false">Players</button>
          ${session.cepheus ? '<button class="tab" role="tab" data-tab="stats" aria-selected="false" title="How good Cepheus is, and how you are doing">Stats</button>' : ''}
          <button class="btn ghost icon-btn only-m" id="g-sheetx" aria-label="Close">${icon('x')}</button>
        </div>
        <div class="tab-panel" id="tp-log" role="tabpanel"><div class="empty"><span class="e-ic">🂠</span>The hand log appears here once cards are in the air.</div></div>
        <div class="tab-panel hidden" id="tp-chat" role="tabpanel"><div class="chat-wrap"><div class="chat-list" id="g-chat"><div class="empty"><span class="e-ic">💬</span>No messages yet. Say hi!</div></div>
          <form class="chat-form" id="g-chatform"><input class="input" id="g-chatin" maxlength="280" placeholder="Message the table" aria-label="Chat message" autocomplete="off"><button class="btn primary">Send</button></form></div></div>
        <div class="tab-panel hidden" id="tp-players" role="tabpanel"></div>
        ${session.cepheus ? '<div class="tab-panel hidden" id="tp-stats" role="tabpanel"></div>' : ''}
      </aside>
    </div>
    <footer class="action-bar" id="g-bar" aria-label="Your actions"><div class="ab-msg"><div class="spinner" style="width:22px;height:22px;border-width:2px"></div>Loading table…</div></footer>
  </div>`;
  bindThemeToggles(App.root);

  const G = {
    session, view: null, pre: null, raiseAmt: null, barKey: null, logId: 0, chatId: 0, tab: 'log', sending: false,
    status: 'connected', ended: null, qrCache: {}, lastLegalKey: null,
  };
  const stage = $('#g-stage');
  const table = new TableView(stage, { onSit: (seat) => session.send({ t: 'sit', seat }) });
  const side = $('#g-side');
  const setPanel = (open) => {
    side.classList.toggle('collapsed', !open);
    $('#g-panel').setAttribute('aria-expanded', String(open));
    if (open) { $('#g-badge').classList.add('hidden'); if (G.tab === 'chat') $('#g-chatbadge').classList.add('hidden'); }
    setTimeout(() => table.layout(), 300);
  };
  setPanel(!mobile() && Prefs.get('panelOpen', true));
  $('#g-panel').addEventListener('click', () => { const open = side.classList.contains('collapsed'); if (!mobile()) Prefs.set('panelOpen', open); setPanel(open); });
  $('#g-chatbtn').addEventListener('click', () => { const open = side.classList.contains('collapsed') || G.tab !== 'chat'; selectTab('chat'); setPanel(open); if (open) $('#g-chatbadge').classList.add('hidden'); });
  $('#g-sheetx').addEventListener('click', () => setPanel(false));
  const soundBtn = () => { const b = $('#g-sound'); b.innerHTML = Sound.muted ? icon('mute') : icon('sound'); b.setAttribute('aria-label', Sound.muted ? 'Unmute sounds' : 'Mute sounds'); b.setAttribute('aria-pressed', String(Sound.muted)); };
  soundBtn();
  $('#g-sound').addEventListener('click', () => { Sound.toggle(); soundBtn(); });
  $('#g-help').addEventListener('click', () => helpOverlay('game'));
  if (!session.offline && !isWatcher) {
    $('#g-invite').addEventListener('click', () => inviteModal());
    $('#g-fair').addEventListener('click', () => fairModal());
  }
  $('#g-watchlink').addEventListener('click', () => viewerLinkModal(session.watchUrl));
  $('#g-copy').addEventListener('click', () => copyRecord(false));
  if (isHost) $('#g-pause').addEventListener('click', () => session.send({ t: 'pause', on: !G.view.paused }));
  $('#g-menu').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });

  // Tabs
  $$('.tab', side).forEach((t) => t.addEventListener('click', () => selectTab(t.dataset.tab)));
  function selectTab(name) {
    G.tab = name;
    $$('.tab', side).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    ['log', 'chat', 'players', 'stats'].forEach((n) => { const p = $('#tp-' + n); if (p) p.classList.toggle('hidden', n !== name); });
    if (name === 'stats') renderStats(true);
    if (name === 'chat') {
      const cb = $('#g-chatbadge'); if (cb) { cb.textContent = ''; cb.classList.add('hidden'); }
      const f = $('#g-feed'); if (f) f.innerHTML = ''; $('#g-chatdot').classList.add('hidden'); const l = $('#g-chat'); l.scrollTop = l.scrollHeight; }
  }
  // Play Against Cepheus: the Stats tab refreshes after each finished hand while it is open.
  let statsHands = -1;
  function renderStats(force) {
    const el = $('#tp-stats');
    if (!el || !session.table || el.classList.contains('hidden')) return;
    const n = session.table.finished.length;
    if (!force && n === statsHands) return;
    statsHands = n;
    CepheusStats.render(el, session, force);
  }
  $('#g-chatform').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('#g-chatin'), text = inp.value.trim();
    if (!text) return;
    session.send({ t: 'chat', text }); inp.value = '';
  });

  /* ----- records ----- */
  // Two versions: the player-only record (default) leaves out hands where a bot made decisions;
  // the full record includes them, tagged [Bots "..."].
  const record = (full) => (full ? session.recordFull || session.record : session.record) || '';
  const twoRecords = () => G.view && G.view.table.botTakeover && !session.offline;
  function copyRecord(full) {
    const r = record(full === true);
    if (!r || !/#\d+/.test(r)) { toast(twoRecords() && !full ? 'No player-only hands yet (hands a bot played are only in the full record).' : 'No hands have finished yet. The record fills in after each hand.', 'info'); if (r) copyText(r, 'Record header copied'); return; }
    copyRecordText(r, full === true ? 'Full game record copied (includes bot hands)' : twoRecords() ? 'Player-only game record copied' : 'Game record copied');
  }
  function copyReadable() {
    const r = record(twoRecords() ? false : true);
    if (!r || !/#\d+/.test(r)) return toast('No hands have finished yet.', 'info');
    copyText(r, 'Readable game record copied');
  }
  function openInViewer(full) {
    const r = record(full === true);
    if (!r || !/#\d+/.test(r)) return toast('No hands to replay yet.', 'info');
    Prefs.set('viewerPending', r);
    open(location.pathname + location.search + '#/viewer', '_blank');
  }
  function downloadRecord(full) {
    const r = record(full === true);
    if (!r) return toast('No record yet.', 'info');
    downloadText(`${(G.view ? G.view.table.name : 'game').replace(/[^\w-]+/g, '-')}-${full === true ? 'full-' : ''}record.txt`, r);
  }

  /* ----- modals & menu ----- */
  function qrSvg(url) { return G.qrCache[url] || (G.qrCache[url] = QR.svg(url)); }
  function inviteModal() {
    const url = session.inviteUrl;
    const m = openModal(`<h2>Invite players</h2><p class="muted" style="margin-top:0">Anyone with this link can join the table, with no account needed.</p>
      <div class="invite-link" style="margin-bottom:14px">${U.esc(url)}</div>
      <div class="qr">${qrSvg(url)}</div>
      ${G.view && G.view.table.spectators ? `<p class="hint">Someone who only wants to watch? Send them the <button class="btn sm" id="m-towatch">${icon('eye')}viewer link</button> instead.</p>` : ''}
      <div class="modal-foot"><button class="btn" data-close>Close</button><button class="btn primary" id="m-copylink">${icon('copy')}Copy link</button></div>`, { label: 'Invite players' });
    $('#m-copylink', m.el).addEventListener('click', () => copyText(url, 'Invite link copied'));
    const tw = $('#m-towatch', m.el); if (tw) tw.addEventListener('click', () => { m.close(); viewerLinkModal(session.watchUrl); });
  }
  function adjustModal() {
    const v = G.view;
    const ps = v.players;
    const m = openModal(`<h2>Adjust stacks</h2><p class="muted" style="margin-top:0">Changes apply before the next hand and are noted in the log.</p>
      <div class="plist">${ps.map((p) => `<label class="prow">${avatarHtml(p.name)}<span class="p-main"><span class="p-name">${U.esc(p.name)}</span><span class="p-sub">${p.seat != null ? 'Seat ' + (p.seat + 1) : 'Not seated'}</span></span>
        <input class="input num" type="number" min="0" step="1" style="width:120px" data-pid="${U.esc(p.pid)}" value="${Number(p.stack) || 0}" aria-label="Stack for ${U.esc(p.name)}"></label>`).join('')}</div>
      <div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn primary" id="m-save">Save stacks</button></div>`, { label: 'Adjust stacks' });
    $('#m-save', m.el).addEventListener('click', () => {
      const stacks = {};
      $$('input[data-pid]', m.el).forEach((i) => { stacks[i.dataset.pid] = Number(i.value); });
      session.send({ t: 'adjust', stacks }); m.close();
    });
  }
  function confirmModal(title, text, okLabel, fn, danger = true) {
    const m = openModal(`<h2>${U.esc(title)}</h2><p class="muted">${U.esc(text)}</p><div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" id="m-ok">${U.esc(okLabel)}</button></div>`, { label: title });
    $('#m-ok', m.el).addEventListener('click', () => { m.close(); fn(); });
  }
  function leaveTable() {
    const v = G.view, me = v && v.seats.find((x) => x && x.isYou);
    if (!isHost && v && v.table.sra && v.status === 'playing' && me && me.inHand && v.phase && v.phase !== 'done') {
      return confirmModal('Leave in the middle of a hand?', 'With the encrypted deal, your browser holds a key that the rest of this hand needs. If you leave now, the hand is cancelled for everyone and the chips go back. Waiting until the hand ends is kinder.', 'Leave anyway', () => { session.leave(); App.session = null; location.hash = '#/'; });
    }
    if (isHost && G.view && G.view.status !== 'ended') {
      return confirmModal('Leave and end the game?', 'You are the host: leaving ends the game for everyone. Players keep their game records.', 'End game & leave', () => { session.leave(); App.session = null; location.hash = '#/'; });
    }
    session.leave(); App.session = null; location.hash = '#/';
  }
  let menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  document.addEventListener('click', (e) => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); });
  function toggleMenu() {
    if (menuEl) return closeMenu();
    const v = G.view, y = v && v.you;
    const seated = y && y.seat != null;
    menuEl = document.createElement('div');
    menuEl.className = 'menu'; menuEl.setAttribute('role', 'menu');
    menuEl.innerHTML = `
      <label><input type="checkbox" id="m-4c" ${Prefs.get('fourColor', false) ? 'checked' : ''}> Four-color deck</label>
      <label><input type="checkbox" id="m-chatpop" ${Prefs.get('chatPopups', true) ? 'checked' : ''}> Show chat on the table</label>
      ${y ? `<label><input type="checkbox" id="m-muck" ${y.autoMuck ? 'checked' : ''}> Auto-muck losing hands</label>` : ''}
      ${seated ? `<label><input type="checkbox" id="m-sitout" ${y.sittingOut ? 'checked' : ''}> Sit out next hands</label>` : ''}
      ${seated && !y.inHand ? `<button id="m-stand" role="menuitem">${icon('users')}Leave my seat</button>` : ''}
      <hr>
      ${session.offline || isWatcher ? '' : `<button id="m-invite" role="menuitem">${icon('link')}Invite players</button>`}
      ${v && v.table.spectators ? `<button id="m-watch" role="menuitem">${icon('eye')}Viewer link (watch only)</button>` : ''}
      ${isWatcher ? '' : `<button id="m-copy" role="menuitem">${icon('copy')}${twoRecords() ? 'Copy player-only record' : 'Copy game record'}</button>
      ${twoRecords() ? `<button id="m-copyfull" role="menuitem">${icon('bot')}Copy full record (with bot hands)</button><button id="m-viewfull" role="menuitem">${icon('history')}Open full record in viewer</button>` : ''}
      <button id="m-view" role="menuitem">${icon('history')}${twoRecords() ? 'Open player-only record in viewer' : 'Open record in viewer'}</button>
      <button id="m-copytext" role="menuitem">${icon('copy')}Copy readable record (text)</button>
      <button id="m-dl" role="menuitem">${icon('download')}Download record (.txt)</button>`}
      ${isWatcher || !seated ? '' : `<button id="m-auto" role="menuitem">${icon('bot')}${G.auto ? 'Stop auto-play' : 'Auto-play (call, check, min-bet, rebuy)'}</button>`}
      ${isWatcher ? '' : `<button id="m-review" role="menuitem">${icon('calc')}Review my play</button>`}
      ${session.offline && session.table ? `<button id="m-speed" role="menuitem">${icon('play')}Bot speed: ${speedName(session.table.s.botSpeed || 'normal')} (tap to change)</button>` : ''}
      ${session.offline ? `<button id="m-again" role="menuitem">${icon('history')}Play again (same settings)</button>` : canRematch() ? `<button id="m-rematch" role="menuitem">${icon('users')}${U.esc(rematchLabel())}</button>` : ''}
      <button id="m-look" role="menuitem">${icon('palette')}Appearance (felt, cards, theme)…</button>
      <button id="m-theme" role="menuitem">${Theme.icon()}Light / dark theme</button>
      ${isHost && v && v.status !== 'ended' ? `<hr>
        ${v.status === 'lobby' ? `<button id="m-start" role="menuitem">${icon('play')}Start game</button>` : `<button id="m-pause" role="menuitem">${icon(v.paused ? 'play' : 'pause')}${v.paused ? 'Resume game' : 'Pause game'}</button>`}
        ${v.table.hostAdjust ? `<button id="m-adjust" role="menuitem">${icon('users')}Adjust stacks…</button>` : ''}
        <button id="m-end" class="danger" role="menuitem">${icon('flag')}End game</button>` : ''}
      <hr><button id="m-leave" class="danger" role="menuitem">${icon('x')}Leave table</button>`;
    $('.game').appendChild(menuEl);
    const on = (id, fn) => { const el = $('#' + id, menuEl); if (el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'click', (e) => { fn(e); if (el.type !== 'checkbox') closeMenu(); }); };
    on('m-4c', (e) => { Prefs.set('fourColor', e.target.checked); Theme.apply(); });
    on('m-chatpop', (e) => Prefs.set('chatPopups', e.target.checked));
    on('m-muck', (e) => session.send({ t: 'automuck', on: e.target.checked }));
    on('m-sitout', (e) => session.send({ t: 'sitout', on: e.target.checked }));
    on('m-stand', () => session.send({ t: 'stand' }));
    on('m-watch', () => viewerLinkModal(session.watchUrl));
    on('m-copytext', copyReadable);
    on('m-invite', inviteModal); on('m-copy', () => copyRecord(false)); on('m-view', () => openInViewer(false)); on('m-dl', () => downloadRecord(false));
    on('m-copyfull', () => copyRecord(true)); on('m-viewfull', () => openInViewer(true));
    on('m-theme', () => { Theme.toggle(); $$('[data-theme-toggle]').forEach((x) => { x.innerHTML = Theme.icon(); }); });
    on('m-start', () => session.send({ t: 'start' }));
    on('m-pause', () => session.send({ t: 'pause', on: !v.paused }));
    on('m-adjust', () => { if (G.view.phase && G.view.phase !== 'done') return toast('Stacks can be adjusted between hands. Pause the game, then wait for this hand to finish.', 'info', 5000); adjustModal(); });
    on('m-end', () => confirmModal('End the game?', 'Everyone keeps their game record. This cannot be undone.', 'End game', () => session.send({ t: 'end' })));
    on('m-leave', leaveTable);
    on('m-look', appearanceModal);
    on('m-review', reviewMine);
    on('m-auto', () => setAuto(!G.auto));
    on('m-speed', () => {
      const order = BOT_SPEEDS.map((x) => x[0]), t = session.table, cur = order.indexOf(t.s.botSpeed || 'normal');
      const next = order[(cur + 1) % order.length];
      session.send({ t: 'speed', speed: next });
      toast(`Bot speed: ${speedName(next)}`, 'info');
      if (next === 'instant' && !G.auto) setAuto(true);
      t.changed();
    });
    on('m-again', playAgain); on('m-rematch', startRematch);
    const first = $('input, button', menuEl); if (first) first.focus();
  }

  /* ----- fair play ----- */
  function fairState() {
    const sra = G.view && G.view.table.sra;
    const ck = session.fair, f = ck && ck.latest;
    const failed = ck && Object.values(ck.hands).find((x) => x.status === 'failed');
    if (failed && !isHost) return { cls: 'bad', label: 'Check failed', icon: 'shieldBad', f: failed };
    if (sra) return { cls: 'ok', label: 'Encrypted', icon: 'lock', sra: true };
    if (isHost) return { cls: 'host', label: 'You deal', icon: 'shieldOk' };
    if (f && f.status === 'verified') return { cls: 'ok', label: 'Verified', icon: 'shieldOk', f };
    return { cls: '', label: 'Fair play', icon: 'shield', f };
  }
  function renderFairBadge() {
    const st = fairState(), b = $('#g-fair');
    if (!b) return;
    b.innerHTML = `${icon(st.icon)}<span class="hide-sm">${st.label}</span>`;
    b.style.color = st.cls === 'bad' ? 'var(--danger)' : st.cls === 'ok' || st.cls === 'host' ? 'var(--accent)' : '';
    b.setAttribute('aria-label', `Fair play: ${st.label}`);
  }
  function fairModal() {
    const st = fairState(), f = st.f, t = G.view ? G.view.table : {};
    let head;
    if (st.sra) {
      openModal(`<h2>${icon('lock')} Encrypted deal</h2>
        <div class="issue ok">${icon('shieldOk')} <b>Nobody can see your cards but you, and that includes the host.</b></div>
        <div class="section-title">How it works</div>
        <ul class="hint" style="padding-left:18px;margin:0;line-height:1.6">
          <li><b>Everyone shuffles:</b> each player's browser locks all 52 cards with its own secret key and shuffles them, so nobody knows the order.</li>
          <li><b>Only you hold the last key:</b> every other player gives your browser their key for your cards, but nobody ever gets yours. The host's device only ever relays locked cards.</li>
          <li><b>Board cards</b> are unlocked street by street. Every key comes with a check, so each browser verifies every card itself.</li>
          <li><b>At showdown</b> your browser shows your hand by giving out your key, or mucks it, following your auto-muck setting. Folded and mucked hands are never revealed${t.recordHole === 'All' ? ', except that this table records every hand once it is over ("All cards")' : ''}.</li>
          <li><b>Tampering is caught:</b> a wrong key, a doctored card or an altered shuffle step stops the deal and names the player whose browser did it.</li>
          <li><b>The limits:</b> nothing can stop two players from sharing their cards in a chat app. If a player leaves in the middle of a hand, the hand is cancelled and the chips go back.</li>
        </ul>
        <div class="modal-foot"><button class="btn primary" data-close>Close</button></div>`, { label: 'Encrypted deal' });
      return;
    }
    if (isHost) {
      head = `<p>Your device is the dealer. Each hand it commits to a secret deck <b>before</b> the players' browsers add their own randomness, so it can't arrange the cards. Every player's browser checks every card it sees against that commitment and re-checks each hand's result against the rules.</p>
        <p class="muted">${t.hostPlays ? 'This table uses the standard deal, so your device can technically see every hole card. For games where that matters, start the next table with <b>Encrypted deal</b> turned on: then nobody, including you, can see other players\' cards.' : 'You are dealing without playing. For full privacy, use the <b>Encrypted deal</b> next time.'}</p>`;
    } else if (st.cls === 'bad') {
      head = `<div class="err-box">${icon('alert')}<div><b>Hand #${Number(f.no)} failed verification.</b><ul style="margin:6px 0 0;padding-left:18px">${f.problems.map((p) => `<li>${U.esc(p)}</li>`).join('')}</ul></div></div>
        <p>The host's device didn't deal or score this hand the way it promised. That points to a modified game page or a tampered connection. Consider stopping play with this host.</p>`;
    } else if (f && f.status === 'verified') {
      head = `<div class="issue ok">${icon('shieldOk')} <b>Hand #${Number(f.no)} verified.</b> The deck was locked in before shuffling, ${f.seeds ? f.seeds.length : 0} player${f.seeds && f.seeds.length === 1 ? '' : 's'} added randomness (including you), and all ${f.verified} cards you were shown matched it.${f.audited ? ' The result was re-checked against the rules.' : ''}</div>
        ${f.notes.length ? `<p class="hint">${f.notes.map(U.esc).join(' ')}</p>` : ''}`;
    } else head = '<p>Verification starts with the next hand that you are at the table for.</p>';
    openModal(`<h2>${icon('shield')} Fair play</h2>${head}
      <div class="section-title">What your browser checks</div>
      <ul class="hint" style="padding-left:18px;margin:0;line-height:1.6">
        <li><b>No peeking:</b> you only ever receive your own hole cards. Other players' cards reach you only if they are shown.</li>
        <li><b>No stacked decks:</b> the host commits to the deck before your random seed is added, so it can't choose who gets which card.</li>
        <li><b>No swapped cards:</b> your cards, the board and every shown hand are checked against the committed deck. Leftover cards are checked when the hand ends.</li>
        <li><b>No fiddled pots:</b> every hand is replayed through the rules engine on your device.</li>
        <li><b>The limits:</b> with the standard deal the dealing device can see hole cards (the <b>Encrypted deal</b> setting removes that), and nothing can stop two players from sharing their cards in a chat app.</li>
      </ul>
      <div class="modal-foot"><button class="btn primary" data-close>Close</button></div>`, { label: 'Fair play' });
  }

  function showEnded(reason) {
    if (G.ended) return;
    G.ended = reason;
    TitleFlash.stop();
    G.barKey = null;
    if (G.view) renderBar();
    $('#g-banner').classList.add('hidden');
    if (isWatcher) {
      openModal(`<div class="state-ic err" style="margin-bottom:12px">${icon('flag')}</div><h2 style="text-align:center">${U.esc(reason)}</h2>
        <p class="muted" style="text-align:center">Thanks for watching!</p><div class="modal-foot" style="justify-content:center"><a class="btn primary" href="#/" data-close>${icon('home')}Home</a></div>`, { label: 'Game ended' });
      return;
    }
    const m = openModal(`<div class="state-ic err" style="margin-bottom:12px">${icon('flag')}</div><h2 style="text-align:center">${U.esc(reason)}</h2>
      <p class="muted" style="text-align:center">Your game record up to this point is saved in this browser. Copy it, download it, or replay it in the viewer.</p>
      <div class="modal-foot" style="justify-content:center"><a class="btn" href="#/" data-close>${icon('home')}Home</a>${session.offline ? `<button class="btn primary" id="e-again">${icon('history')}Play again</button>` : canRematch() ? `<button class="btn primary" id="e-rematch">${icon('users')}${U.esc(rematchLabel())}</button>` : ''}<button class="btn" id="e-review">${icon('calc')}Review my play</button><button class="btn" id="e-dl">${icon('download')}Download</button><button class="btn" id="e-view">${icon('history')}Open in viewer</button><button class="btn primary" id="e-copy">${icon('copy')}${twoRecords() ? 'Copy player-only record' : 'Copy Game Record'}</button>${twoRecords() ? `<button class="btn" id="e-full">${icon('bot')}Copy full record</button>` : ''}</div>`, { label: 'Game ended' });
    $('#e-copy', m.el).addEventListener('click', () => copyRecord(false));
    if ($('#e-full', m.el)) $('#e-full', m.el).addEventListener('click', () => copyRecord(true));
    $('#e-view', m.el).addEventListener('click', openInViewer);
    $('#e-dl', m.el).addEventListener('click', downloadRecord);
    $('#e-review', m.el).addEventListener('click', () => { m.close(); reviewMine(); });
    const ea = $('#e-again', m.el); if (ea) ea.addEventListener('click', () => { m.close(); playAgain(); });
    const er = $('#e-rematch', m.el); if (er) er.addEventListener('click', () => { m.close(); startRematch(); });
  }

  /** Hand review of this player's decisions, from the full record (it has all of their own cards). */
  function reviewMine() {
    const r = record(true);
    if (!r || !/#\d+/.test(r)) return toast('No finished hands to review yet.', 'info');
    reviewModal(r, myName(), { cepheus: !!session.cepheus });
  }

  /* ----- rematch (online) and play again (bots) ----- */
  const myName = () => (G.view && G.view.you && G.view.you.name) || session.name;
  function canRematch() { return !isWatcher && !session.offline && (!!session.rematch || Rematch.allowedView(G.view)); }
  function rematchLabel() { const r = session.rematch; return r ? `Join ${r.from}'s rematch` : G.rematching ? 'Setting up the rematch…' : 'Rematch'; }
  function rematchBtn() {
    if (session.offline) return `<button class="btn primary" data-do="again">${icon('history')}Play again</button>`;
    return canRematch() ? `<button class="btn primary" data-do="rematch" ${G.rematching ? 'disabled' : ''}>${icon('users')}${U.esc(rematchLabel())}</button>` : '';
  }
  /** The host of a game still being played ends it for everyone by leaving, so ask first. */
  function hostStillPlaying() { const v = G.view; return isHost && v && v.status === 'playing' && !v.waiting; }
  function startRematch() {
    if (session.rematch) return joinRematch();
    if (G.rematching) return;
    if (isHost && session.rematchAsk && Date.now() - session.rematchAsk.at < 20000) return toast('Another player is setting up a rematch. Their invitation is on its way.', 'info');
    if (hostStillPlaying()) return confirmModal('Start a rematch?', 'You are the host, so this game ends for everyone. They all get an invitation to the rematch.', 'Start rematch', openRematch, false);
    openRematch();
  }
  async function openRematch() {
    G.rematching = true; G.barKey = null; if (G.view) renderBar();
    const done = () => { G.rematching = false; G.barKey = null; if (G.view) renderBar(); };
    try {
      const settings = isHost ? { ...session.settings } : await session.askRematch();
      if (!settings) { done(); if (session.rematch) showRematchCard(); else toast('The host did not answer, so the rematch could not be set up.', 'error'); return; }
      toast('Opening the rematch table…', 'info');
      const v = G.view, humans = v ? v.players.filter((p) => !p.isBot).length : 0;
      const sess = new HostSession(settings, myName());
      await sess.start();
      sess.rematchOf = { headsUp: humans === 2 || settings.maxSeats === 2, started: false };
      if (isHost) session.offerRematch(myName(), sess.id, session.pid);
      else session.send({ t: 'rematch-ready', id: sess.id });
      // Give the invitation a moment to go out before this table closes.
      const old = session;
      setTimeout(() => { try { old.leave(); } catch { /* ignore */ } }, 1200);
      App.session = sess;
      if (location.hash.startsWith('#/host')) route(true); else location.hash = '#/host';
      toast(sess.rematchOf.headsUp ? 'Rematch table open. The game deals as soon as your opponent sits down.' : 'Rematch table open. Everyone has been invited; press Start when they are seated.', 'info', 6000);
    } catch (e) { done(); toast(`Could not open the rematch table: ${Net.friendly(e).title}`, 'error'); }
  }
  function joinRematch() {
    const r = session.rematch;
    if (!r) return;
    const go = () => {
      App.autoJoin = { id: r.id, name: myName() };
      App.session = null;
      try { session.leave(); } catch { /* ignore */ }
      location.hash = '#join=' + r.id;
    };
    if (hostStillPlaying()) return confirmModal('Join the rematch?', 'You are the host, so leaving ends this game for everyone still playing.', 'Join rematch', go, false);
    go();
  }
  let rcard = null;
  function hideRematchCard() { if (rcard) { rcard.remove(); rcard = null; } }
  function showRematchCard() {
    const r = session.rematch;
    if (!r || isWatcher) return;
    hideRematchCard();
    rcard = document.createElement('div');
    rcard.className = 'rematch-card'; rcard.setAttribute('role', 'alertdialog'); rcard.setAttribute('aria-label', 'Rematch invitation');
    rcard.innerHTML = `<div class="rc-text"><b>${U.esc(r.from)} wants a rematch</b><span>Same settings, fresh stacks. ${U.esc(r.from)} hosts the new table.</span></div>
      <div class="rc-btns"><button class="btn" data-rc="no">No thanks</button><button class="btn primary" data-rc="yes">${icon('users')}Join rematch</button></div>`;
    rcard.addEventListener('click', (e) => { const b = e.target.closest('[data-rc]'); if (!b) return; hideRematchCard(); if (b.dataset.rc === 'yes') joinRematch(); });
    document.body.appendChild(rcard);
    Sound.play('chime');
    if (document.hidden) TitleFlash.start(`🔁 ${r.from} wants a rematch`);
    announce(`${r.from} wants a rematch.`);
    G.barKey = null; if (G.view) renderBar();
  }
  function playAgain() {
    const go = () => {
      const old = session;
      old.leave();
      const sess = new BotSession({ ...old.settings }, old.name, old.bots.map((b) => ({ ...b })));
      sess.cepheus = old.cepheus;
      App.session = sess.start();
      route(true);
    };
    const v = G.view;
    if (v && v.status === 'playing' && !(v.you && v.you.busted) && !v.waiting) return confirmModal('Start a new game?', 'This game ends and a new one starts with the same settings and opponents.', 'Play again', go, false);
    go();
  }

  /* ----- lobby dock ----- */
  function renderLobby(v) {
    const el = $('#g-lobby');
    const show = v.status === 'lobby' && !isWatcher;
    el.classList.toggle('hidden', !show);
    if (!show) return;
    const url = session.inviteUrl;
    const seated = v.players.filter((p) => p.seat != null);
    const t = v.table;
    const key = JSON.stringify([url, v.players, v.you && v.you.seat]);
    if (key === G.lobbyKey) return;
    G.lobbyKey = key;
    el.innerHTML = `
      <h3>Invite friends</h3>
      <div class="invite-link" aria-label="Invite link">${U.esc(url)}</div>
      <button class="btn primary" id="l-copy">${icon('copy')}Copy invite link</button>
      <div class="qr" title="Scan to join">${qrSvg(url)}</div>
      <h3>At the table · ${v.players.length}</h3>
      <div class="plist">${v.players.map((p) => `<div class="prow">${avatarHtml(p.name)}<div class="p-main"><div class="p-name">${U.esc(p.name)}${p.isHost ? ' ★' : ''}${v.you && p.pid === v.you.pid ? ' <span class="muted">(you)</span>' : ''}</div>
        <div class="p-sub">${p.seat != null ? 'Seat ' + (p.seat + 1) : 'Choosing a seat…'}${p.connected ? '' : ' · disconnected'}</div></div></div>`).join('')}</div>
      <h3>Settings</h3>
      <div class="summary">
        <div class="sum-tile" style="grid-column:span 2"><b>${U.esc(t.variantName)}</b><span>Game</span></div>
        <div class="sum-tile"><b>${U.fmt(t.sb)}/${U.fmt(t.bb)}</b><span>Blinds${t.levelHands ? ` · up every ${t.levelHands}` : ''}</span></div>
        <div class="sum-tile"><b>${t.ante ? U.fmt(t.ante) : 'None'}</b><span>Ante</span></div>
        <div class="sum-tile"><b>${U.fmt(t.startingStack)}</b><span>Starting stack</span></div>
        <div class="sum-tile"><b>${t.maxSeats}</b><span>Seats</span></div>
        <div class="sum-tile"><b>${t.timer ? t.timer + 's' : 'Off'}</b><span>Action timer</span></div>
        <div class="sum-tile"><b>${!t.rebuys ? 'No' : t.maxRebuys ? `${t.maxRebuys} each` : 'Unlimited'}</b><span>Rebuys</span></div>
        <div class="sum-tile"><b>${t.recordHole === 'All' ? 'All cards' : 'Showdown only'}</b><span>Hole cards in record</span></div>
        <div class="sum-tile"><b>${t.rakePct ? `${t.rakePct}%${t.rakeCap ? `, cap ${t.rakeCap} bb` : ', no cap'}` : 'None'}</b><span>Rake</span></div>
        <div class="sum-tile" style="grid-column:span 2">${t.sra ? `<b>${icon('lock')} Encrypted deal</b><span>Nobody can see other players' cards, not even the host</span>` : `<b>${icon('shieldOk')} Provably fair shuffle</b><span>${t.hostPlays ? 'Host is also playing' : 'Host deals only (does not play)'}${t.botTakeover ? ' · bots replace dropouts' : ''}</span>`}</div>
      </div>
      ${v.you && v.you.isHost
        ? `<button class="btn primary lg" id="l-start" ${seated.length < 2 ? 'disabled' : ''}>${icon('play')}Start Game</button><p class="hint" style="margin:0;text-align:center">${seated.length < 2 ? 'Waiting for at least one more player to sit down.' : `${seated.length} players seated. Ready when you are.`}</p>`
        : `<p class="hint" style="text-align:center;margin:0">${v.you && v.you.seat == null ? 'Click an empty seat on the table to sit down.' : `Waiting for ${U.esc(v.hostName)} to start the game…`}</p>`}`;
    $('#l-copy', el).addEventListener('click', () => copyText(url, 'Invite link copied'));
    const st = $('#l-start', el); if (st) st.addEventListener('click', () => session.send({ t: 'start' }));
  }

  /* ----- action bar ----- */
  const bar = $('#g-bar');
  function quickSizes(L) {
    const cl = (x) => Math.max(L.minTo, Math.min(L.maxTo, Math.round(x)));
    const base = L.myBet + L.toCall, pot = L.pot + L.toCall;
    const q = [['min', 'Min', L.minTo], ['half', '½ Pot', cl(base + pot / 2)], ['3q', '¾ Pot', cl(base + (pot * 3) / 4)], ['pot', 'Pot', cl(base + pot)]];
    // Pot limit caps the bet at the pot, so "All-in" only appears when it is actually allowed.
    if (!L.capped) q.push(['all', 'All-in', L.maxTo]);
    return q;
  }
  function amtNow() { const i = $('#ab-amt'); return i ? Math.round(Number(i.value)) : null; }
  function setAmt(x, from) {
    const L = G.view && G.view.legal;
    if (!L) return;
    x = Math.max(L.minTo, Math.min(L.maxTo, Math.round(Number(x) || L.minTo)));
    G.raiseAmt = x;
    const r = $('#ab-range'), i = $('#ab-amt'), b = $('#ab-raise');
    if (r && from !== 'range') r.value = x;
    if (i && from !== 'input') i.value = x;
    if (b) b.innerHTML = `${x === L.maxTo && !L.capped ? 'All-in' : L.isBet ? 'Bet' : 'Raise to'} ${U.fmt(x)}<small>R · Enter</small>`;
  }
  /** Instant games: hands per minute over the last few seconds, and your running result. */
  function instantRate(v) {
    const now = Date.now(), q = G.rate || (G.rate = []);
    if (!q.length || q[q.length - 1][1] !== v.handNo) q.push([now, v.handNo]);
    while (q.length > 2 && now - q[0][0] > 6000) q.shift();
    const [t0, n0] = q[0], dt = now - t0;
    return dt > 1500 && v.handNo > n0 ? ` · <b class="num">${U.fmt(Math.round(((v.handNo - n0) * 60000) / dt))}</b> hands a minute` : '';
  }
  function instantNet(v) {
    const me = v.players.find((p) => v.you && p.pid === v.you.pid), n = me ? me.net : 0;
    return `${n > 0 ? '+' : n < 0 ? '−' : ''}${U.fmt(Math.abs(n))}`;
  }
  function myHandName(v) { const s = v.you && v.you.seat != null ? v.seats[v.you.seat] : null; return s && s.handName; }
  function renderBar() {
    const v = G.view, y = v.you, L = v.legal;
    const seatedCount = v.seats.filter(Boolean).length;
    const key = JSON.stringify([G.auto, session.rematch && session.rematch.id, G.rematching, Rematch.allowedView(v), v.status, y && [y.seat, y.inHand, y.dealt, y.canShow, y.canRebuy, y.sittingOut, y.busted, y.toCallPreview > 0, y.stack], L, v.handNo, v.street, G.pre, v.paused, seatedCount, myHandName(v), G.ended, G.status]);
    if (key === G.barKey) return;
    G.barKey = key;
    G.sending = false;
    let html = '';
    const hn = myHandName(v);
    if (isWatcher && !(G.ended || v.status === 'ended')) {
      html = `<div class="ab-msg">${icon('eye')}You're watching${v.status === 'lobby' ? ': the game hasn\'t started yet' : ''}. Hole cards stay hidden; you'll see hands only when they're shown.</div>`;
    } else if (G.ended || v.status === 'ended') {
      html = `<div class="ab-msg">Game over.${isWatcher ? '' : rematchBtn() + `<button class="btn" data-do="review">${icon('calc')}Review my play</button>`}<button class="btn ${isWatcher || !rematchBtn() ? 'primary' : ''}" data-do="copy">${icon('copy')}Copy Game Record</button><button class="btn" data-do="viewer">${icon('history')}Open in viewer</button></div>`;
    } else if (!y || y.seat == null) {
      const free = v.seats.some((s) => !s);
      const dealer = y && y.isHost && !v.table.hostPlays;
      html = dealer
        ? `<div class="ab-msg">${icon('shieldOk')}You are dealing this game and not playing.${v.status === 'lobby' ? `<button class="btn primary lg" data-do="start" ${seatedCount < 2 ? 'disabled' : ''}>${icon('play')}Start Game</button>` : ''}</div>`
        : `<div class="ab-msg">${icon('users')}${free ? 'Click an empty seat on the table to sit down.' : 'The table is full, so you are watching. A seat may open up.'}</div>`;
    } else if (v.status === 'lobby') {
      html = y.isHost
        ? `<div class="ab-msg"><span>${seatedCount} seated</span><button class="btn primary lg" data-do="start" ${seatedCount < 2 ? 'disabled' : ''}>${icon('play')}Start Game</button></div>`
        : `<div class="ab-msg"><div class="spinner" style="width:20px;height:20px;border-width:2px"></div>Waiting for ${U.esc(v.hostName)} to start the game…</div>`;
    } else if (G.auto && v.table.botSpeed === 'instant') {
      html = `<div class="ab-msg auto-on instant-on">${icon('play')}<span><b>Instant:</b> hand <b class="num">#${U.fmt(v.handNo)}</b>${instantRate(v)} · you <b class="num">${instantNet(v)}</b></span><button class="btn primary" data-do="autooff">Stop auto-play <kbd>A</kbd></button></div>`;
    } else if (G.auto) {
      html = `<div class="ab-msg auto-on">${icon('bot')}<span><b>Auto-play on:</b> call, check or bet the minimum${v.table.rebuys ? ', auto-rebuy' : ''}.${hn && y.inHand ? ` <span class="strength">Your hand: <b>${U.esc(hn)}</b></span>` : ''}</span><button class="btn primary" data-do="autooff">Stop auto-play <kbd>A</kbd></button></div>`;
    } else if (L) {
      const qs = quickSizes(L);
      if (G.legalKey !== JSON.stringify(L)) { G.legalKey = JSON.stringify(L); G.raiseAmt = L.minTo; }
      const callLabel = L.canCheck ? 'Check' : `${L.toCall >= L.stack ? 'All-in' : 'Call'} ${U.fmt(L.toCall)}`;
      html = `<div class="ab-wrap">
        ${L.canRaise && L.maxTo > L.minTo ? `<div class="ab-raise">
          <div class="quick">${qs.map(([k, label, val]) => `<button class="btn sm" data-q="${val}" title="${U.fmt(val)}">${label}</button>`).join('')}</div>
          <div class="slider-row"><button class="btn sm icon-btn" data-step="-1" aria-label="Decrease bet">−</button>
            <input type="range" id="ab-range" min="${L.minTo}" max="${L.maxTo}" step="1" value="${G.raiseAmt}" aria-label="Bet amount">
            <button class="btn sm icon-btn" data-step="1" aria-label="Increase bet">+</button>
            <input class="input amt-input" id="ab-amt" type="number" inputmode="numeric" min="${L.minTo}" max="${L.maxTo}" step="1" value="${G.raiseAmt}" aria-label="Bet amount, type a number"></div>
        </div>` : ''}
        <div class="ab-buttons">
          <button class="act fold" data-act="fold">Fold<small>F</small></button>
          <button class="act call" data-act="${L.canCheck ? 'check' : 'call'}">${callLabel}<small>C</small></button>
          ${L.canRaise ? '<button class="act raise" data-act="raise" id="ab-raise"></button>' : ''}
        </div>${isWatcher ? '' : `<div class="ab-auto"><button class="btn sm ghost" data-do="auto" title="Calls every bet, checks when it can, bets the minimum when nobody has bet, and rebuys automatically (A)">${icon('bot')}Auto-play</button></div>`}</div>`;
    } else if (y.inHand) {
      const toCall = y.toCallPreview;
      html = `<div class="ab-wrap" style="align-items:center">
        ${hn ? `<div class="strength" aria-live="polite">Your hand: <b>${U.esc(hn)}</b></div>` : ''}
        <div class="pre" role="group" aria-label="Pre-select your next action">
          <label><input type="checkbox" data-pre="checkfold" ${G.pre === 'checkfold' ? 'checked' : ''}> Check/Fold</label>
          <label><input type="checkbox" data-pre="callany" ${G.pre === 'callany' ? 'checked' : ''}> Call any</label>
          <label style="${toCall > 0 ? 'opacity:.5' : ''}"><input type="checkbox" data-pre="check" ${G.pre === 'check' ? 'checked' : ''} ${toCall > 0 ? 'disabled' : ''}> Check</label>
        </div><button class="btn sm ghost" data-do="auto" title="Calls every bet, checks when it can, bets the minimum when nobody has bet, and rebuys automatically (A)">${icon('bot')}Auto-play</button></div>`;
    } else {
      const bits = [];
      if (y.canShow && v.phase === 'done') bits.push(`<button class="btn" data-do="show">Show my cards</button>`);
      if (y.canRebuy) bits.push(`<button class="btn primary" data-do="rebuy">${icon('plus')}Rebuy ${U.fmt(v.table.startingStack)}</button>`);
      if (y.busted && !v.table.rebuys) bits.push('<span>You are out of chips. Thanks for playing!</span>');
      if ((session.offline && y.busted && !y.canRebuy) || (!session.offline && canRematch())) bits.push(rematchBtn());
      else if (y.sittingOut && !y.busted) bits.push(`<span>You are sitting out.</span><button class="btn primary" data-do="back">I'm back</button>`);
      else if (!y.busted) bits.push(`<span>${v.paused ? 'Game paused.' : y.dealt && v.phase !== 'done' ? 'You folded. Waiting for the next hand…' : 'Waiting for the next hand…'}</span><button class="btn ghost" data-do="sitout">Sit out</button><button class="btn sm ghost" data-do="auto" title="Calls every bet, checks when it can, bets the minimum when nobody has bet, and rebuys automatically (A)">${icon('bot')}Auto-play</button>`);
      html = `<div class="ab-msg">${hn && y.dealt ? `<span class="strength">Your hand: <b>${U.esc(hn)}</b></span>` : ''}${bits.join('')}</div>`;
    }
    bar.innerHTML = html;
    if (L && L.canRaise) setAmt(G.raiseAmt);
  }
  bar.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || t.disabled) return;
    if (t.dataset.act) return act(t.dataset.act);
    if (t.dataset.q) return setAmt(t.dataset.q);
    if (t.dataset.step) return setAmt((amtNow() || 0) + Number(t.dataset.step) * G.view.table.bb);
    const d = t.dataset.do;
    if (d === 'start') session.send({ t: 'start' });
    else if (d === 'show') session.send({ t: 'show' });
    else if (d === 'rebuy') session.send({ t: 'rebuy' });
    else if (d === 'back') session.send({ t: 'sitout', on: false });
    else if (d === 'sitout') session.send({ t: 'sitout', on: true });
    else if (d === 'copy') copyRecord();
    else if (d === 'viewer') openInViewer();
    else if (d === 'rematch') startRematch();
    else if (d === 'review') reviewMine();
    else if (d === 'auto') setAuto(true);
    else if (d === 'autooff') setAuto(false);
    else if (d === 'again') playAgain();
  });
  bar.addEventListener('input', (e) => {
    if (e.target.id === 'ab-range') setAmt(e.target.value, 'range');
    if (e.target.id === 'ab-amt') { const L = G.view.legal; const x = Math.round(Number(e.target.value)); if (L && x >= L.minTo && x <= L.maxTo) setAmt(x, 'input'); }
  });
  bar.addEventListener('change', (e) => {
    if (e.target.id === 'ab-amt') setAmt(e.target.value);
    if (e.target.dataset.pre) { G.pre = e.target.checked ? e.target.dataset.pre : null; G.barKey = null; renderBar(); }
  });
  /*
   * Auto-play: a simple, fixed strategy for your seat. Facing a bet: call. Nobody has bet on this
   * street: bet the minimum. Otherwise (the big blind's option): check. Out of chips: rebuy when allowed.
   * It only ever sends the same actions your own buttons would, and stops when you press Stop.
   */
  function setAuto(on) {
    G.auto = !!on; G.autoKey = null; G.pre = null; G.barKey = null;
    if (session.offline) session.send({ t: 'autoplay', on: G.auto }); // Instant games: the table plays your seat itself
    if (G.view) renderBar();
    toast(on ? 'Auto-play on: calling, checking and betting the minimum for you.' : 'Auto-play off. You are back in control.', 'info');
    announce(on ? 'Auto-play on.' : 'Auto-play off.');
    if (on && G.view) update(G.view);
  }
  function autoPlay(v) {
    const y = v.you;
    if (!y || G.ended || v.status !== 'playing' || isWatcher) return;
    if (y.canRebuy && G.autoRebuy !== `${v.handNo}:${y.rebuys || 0}`) { G.autoRebuy = `${v.handNo}:${y.rebuys || 0}`; session.send({ t: 'rebuy' }); }
    const L = v.legal;
    if (!L || v.table.botSpeed === 'instant') return;
    const key = `${v.handNo}:${v.street}:${L.currentBet}:${L.myBet}:${L.toCall}`;
    if (key === G.autoKey) return;
    G.autoKey = key;
    setTimeout(() => {
      const w = G.view, M = w && w.legal;
      if (!G.auto || G.dead || !M || `${w.handNo}:${w.street}:${M.currentBet}:${M.myBet}:${M.toCall}` !== key) return;
      if (M.toCall > 0) session.send({ t: 'action', action: 'call' });
      else if (M.isBet && M.canRaise) session.send({ t: 'action', action: 'bet', amount: M.minTo });
      else session.send({ t: 'action', action: 'check' });
    }, v.table.botSpeed === 'ultra' ? 60 : 450);
  }
  function act(type) {
    const L = G.view && G.view.legal;
    if (!L || G.sending) return;
    G.sending = true;
    $$('button', bar).forEach((b) => { b.disabled = true; });
    if (type === 'raise') session.send({ t: 'action', action: L.isBet ? 'bet' : 'raise', amount: amtNow() || G.raiseAmt });
    else session.send({ t: 'action', action: type });
    setTimeout(() => { if (G.sending) { G.sending = false; G.barKey = null; renderBar(); } }, 2500);
  }

  /* ----- chat feed on the table (when the chat tab is not open) ----- */
  const feed = $('#g-feed');
  function showFeed(c) {
    const el = document.createElement('div');
    el.className = 'cf';
    el.title = 'Open chat';
    el.innerHTML = `<b style="color:hsl(${hueOf(c.from)} 60% 55%)">${c.bot ? '🤖 ' : ''}${U.esc(c.from)}</b>${U.esc(c.text)}`;
    el.addEventListener('click', () => { setPanel(true); selectTab('chat'); $('#g-chatin').focus(); feed.innerHTML = ''; });
    feed.appendChild(el);
    while (feed.children.length > 4) feed.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, Math.min(12000, 6000 + c.text.length * 50));
  }

  /* ----- side panel ----- */
  function renderSide(v) {
    const lastLog = v.log.length ? v.log[v.log.length - 1].id : 0;
    if (lastLog !== G.logId) {
      const box = $('#tp-log'), atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
      const fresh = v.log.filter((l) => l.id > G.logId);
      G.logId = lastLog;
      box.innerHTML = v.log.map((l) => `<div class="log-line ${U.esc(l.kind)}">${l.kind === 'hand' ? '— ' : ''}${U.esc(l.text)}${l.kind === 'hand' ? ' —' : ''}</div>`).join('') || box.innerHTML;
      if (atBottom || fresh.length) box.scrollTop = box.scrollHeight;
      if (fresh.length && fresh.length < 6) announce(fresh.map((l) => l.text).join('. '));
    }
    const lastChat = v.chat.length ? v.chat[v.chat.length - 1].id : 0;
    if (lastChat !== G.chatId) {
      const fresh = v.chat.filter((c) => c.id > G.chatId);
      G.chatId = lastChat;
      const list = $('#g-chat');
      list.innerHTML = v.chat.map((c) => `<div class="chat-msg${c.viewer ? ' viewer' : ''}"><b style="color:hsl(${hueOf(c.from)} 60% 60%)">${c.bot ? '🤖 ' : ''}${U.esc(c.from)}</b>${U.esc(c.text)}</div>`).join('');
      list.scrollTop = list.scrollHeight;
      const others = fresh.filter((c) => !v.you || c.from !== v.you.name);
      if (G.chatSeen) {
        const chatOpen = G.tab === 'chat' && !side.classList.contains('collapsed');
        const popups = Prefs.get('chatPopups', true);
        for (const c of fresh.slice(-4)) {
          // A speech bubble over the sender's seat, for everyone, every time.
          const seat = v.seats.findIndex((s) => s && s.name === c.from);
          if (popups && seat >= 0) table.bubble(seat, c.from, c.text);
          // Messages from others also go into the corner feed whenever the chat tab isn't open.
          if (popups && !chatOpen && c.from !== (v.you && v.you.name)) showFeed(c);
        }
        if (others.length) {
          if (!chatOpen) $('#g-chatdot').classList.remove('hidden');
          if (side.classList.contains('collapsed')) { const b = $('#g-badge'); b.textContent = '•'; b.classList.remove('hidden'); }
          if (!chatOpen) { const b = $('#g-chatbadge'); b.textContent = String(Math.min(9, (Number(b.textContent) || 0) + others.length)); b.classList.remove('hidden'); }
          if (!popups && !chatOpen) toast(`${others[0].from}: ${others[0].text}`, 'info', 3000);
          Sound.play('chat');
          if (document.hidden && !TitleFlash.timer) TitleFlash.start(`💬 ${others[others.length - 1].from}: ${others[others.length - 1].text}`.slice(0, 60));
          announce(`${others[others.length - 1].from} says: ${others[others.length - 1].text}`);
        }
      }
    }
    G.chatSeen = true; // history present on the first view is not "new"
    const pkey = JSON.stringify([v.players, v.phase, v.you && v.you.pid, v.table.hostAdjust, v.table.hostKick]);
    if (pkey !== G.pkey) {
      G.pkey = pkey;
      const host = v.you && v.you.isHost;
      $('#tp-players').innerHTML = `${host && v.table.hostAdjust && v.status !== 'ended' ? `<button class="btn sm" id="p-adjust" style="width:100%;margin-bottom:10px" ${v.phase && v.phase !== 'done' ? 'disabled title="Available between hands"' : ''}>${icon('users')}Adjust stacks</button>` : ''}
        <div class="plist">${v.players.map((p) => `<div class="prow">${avatarHtml(p.name)}<div class="p-main">
          <div class="p-name">${p.isBot ? '🤖 ' : ''}${U.esc(p.name)}${p.isHost ? ' ★' : ''}${v.you && v.you.pid === p.pid ? ' <span class="muted">(you)</span>' : ''}</div>
          <div class="p-sub"><span class="status-dot ${p.connected ? '' : 'off'}"></span>${p.connected ? '' : 'Disconnected · '}${p.seat != null ? 'Seat ' + (p.seat + 1) : 'Watching'} · <span class="num">${U.fmt(p.stack)}</span>
            · <span class="num ${p.net > 0 ? 'net-pos' : p.net < 0 ? 'net-neg' : ''}">${p.net > 0 ? '+' : ''}${U.fmt(p.net)}</span>${p.sittingOut ? ' · sitting out' : ''}${p.rebuys ? ` · ${p.rebuys} rebuy${p.rebuys > 1 ? 's' : ''}` : ''}</div></div>
          ${host && v.table.hostKick && !p.isHost && v.status !== 'ended' ? `<button class="btn sm danger" data-kick="${U.esc(p.pid)}" aria-label="Remove ${U.esc(p.name)}">Remove</button>` : ''}</div>`).join('')}</div>`;
      const adj = $('#p-adjust'); if (adj) adj.addEventListener('click', adjustModal);
      $$('[data-kick]').forEach((b) => b.addEventListener('click', () => {
        const p = v.players.find((x) => x.pid === b.dataset.kick);
        confirmModal(`Remove ${p ? p.name : 'player'}?`, 'They will be folded if they are in a hand and cannot rejoin with the same link.', 'Remove', () => session.send({ t: 'kick', pid: b.dataset.kick }));
      }));
    }
  }

  /* ----- update from a new state ----- */
  function update(v) {
    const prev = G.view;
    G.view = v;
    document.title = TitleFlash.base = `${v.table.name} · Feltroom`;
    $('#g-name').textContent = v.table.name;
    const seated = v.seats.filter(Boolean).length;
    const me = v.table.cepheus && v.you && v.players.find((p) => p.pid === v.you.pid);
    // Play Against Cepheus: the running result comes first so it stays visible on a phone.
    const score = me ? `You ${me.net > 0 ? '+' : ''}${U.fmt(me.net)} over ${v.table.handsDone} hand${v.table.handsDone === 1 ? '' : 's'}${v.table.handsDone ? ` (${(me.net / v.table.bb / v.table.handsDone).toFixed(2)} bb/hand)` : ''} · ` : '';
    $('#g-sub').textContent = `${score}${v.table.variant} · Blinds ${U.fmt(v.table.sb)}/${U.fmt(v.table.bb)}${v.table.ante ? ` · Ante ${U.fmt(v.table.ante)}` : ''}${v.table.rakePct ? ` · Rake ${v.table.rakePct}%${v.table.rakeCap ? ` (cap ${v.table.rakeCap} bb)` : ''}` : ''}${v.table.levelHands && v.status === 'playing' ? ` · Level ${v.table.level} (up in ${v.table.nextLevelIn})` : ''} · ${v.status === 'lobby' ? 'Lobby' : v.handNo ? 'Hand #' + v.handNo : 'Starting'}${me ? ' · stacks reset each hand' : ` · ${seated}/${v.table.maxSeats} seated`}`;
    renderFairBadge();
    // Instant games finish many hands a second: the Stats tab catches up every two seconds instead.
    if (session.cepheus && (v.table.botSpeed !== 'instant' || !(Date.now() - (G.statsAt || 0) < 2000))) { G.statsAt = Date.now(); renderStats(false); }
    // (Instant games skip this: the record changes every few seconds, so it is compacted when you copy it.)
    if (!isWatcher && v.table.botSpeed !== 'instant') { CompactCache.prime(record(false)); CompactCache.prime(record(true)); }
    $('#g-watchlink').classList.toggle('hidden', !(v.table.spectators && session.watchUrl));
    if (isWatcher) {
      // Viewers chat only if the table allows it.
      const canChat = v.table.viewerChat;
      $('#g-chatform').classList.toggle('hidden', !canChat);
      let note = $('#g-chatnote');
      if (!canChat && !note) { note = document.createElement('p'); note.id = 'g-chatnote'; note.className = 'hint'; note.style.margin = '8px 0 0'; note.textContent = 'Viewers can read the chat but not post at this table.'; $('#g-chatform').after(note); }
      if (note) note.classList.toggle('hidden', !!canChat);
    }
    if (isHost) {
      const pb = $('#g-pause');
      pb.classList.toggle('hidden', v.status !== 'playing');
      pb.innerHTML = v.paused ? `${icon('play')}<span class="hide-sm">Resume</span>` : `${icon('pause')}<span class="hide-sm">Pause</span>`;
      pb.setAttribute('aria-label', v.paused ? 'Resume game' : 'Pause game');
    }
    const ban = $('#g-banner');
    const banText = G.ended ? '' : G.status === 'reconnecting' ? 'Connection lost. Reconnecting to the host…' : v.paused ? 'Game paused by the host' : v.status === 'playing' && v.waiting && (!v.phase || v.phase === 'done') ? 'Waiting for at least two players with chips…'
      : v.sraWait.length && v.phase && v.phase !== 'betting' && v.phase !== 'done' ? `Waiting for ${v.sraWait.join(', ')} to unlock the next cards…` : '';
    ban.textContent = banText; ban.classList.toggle('hidden', !banText); ban.classList.toggle('warn', G.status === 'reconnecting');
    renderLobby(v);
    if (prev && prev.status === 'lobby' && v.status !== 'lobby') setTimeout(() => table.layout(), 30);
    // Reset pre-actions on a new hand or street; "Check" is cancelled by a bet.
    if (prev && (prev.handNo !== v.handNo || prev.street !== v.street)) G.pre = null;
    if (G.pre === 'check' && v.you && v.you.toCallPreview > 0 && !v.legal) G.pre = null;
    table.render({
      maxSeats: v.table.maxSeats, mySeat: v.you && v.you.seat != null ? v.you.seat : 0, handKey: v.handNo ? 'h' + v.handNo : '',
      seats: v.seats, board: v.board, pots: v.pots, street: v.shuffling ? (v.table.sra ? 'Encrypting deck…' : 'Shuffling…') : v.handNo ? v.street : v.status === 'lobby' ? 'Waiting for players' : '',
      results: v.results, timer: v.timer, readOnly: false, feltText: v.table.name,
      canSit: !!v.you && v.you.seat == null && v.status !== 'ended' && !(v.you.isHost && !v.table.hostPlays),
    }, { animate: v.table.botSpeed !== 'instant' }); // Instant: no motion or sounds, just the latest picture
    renderBar();
    renderSide(v);
    // Rematch: a player who accepted takes the first free seat; heads-up, the new host deals once both are seated.
    if (session.autoSit && v.status === 'lobby' && v.you && v.you.seat == null) {
      session.autoSit = false;
      const free = v.seats.findIndex((x) => !x);
      if (free >= 0) session.send({ t: 'sit', seat: free });
    }
    const rm = session.rematchOf;
    if (isHost && rm && rm.headsUp && !rm.started && v.status === 'lobby' && seated >= 2) {
      rm.started = true;
      setTimeout(() => { if (G.view && G.view.status === 'lobby') session.send({ t: 'start' }); }, 1200);
    }
    if (G.auto) autoPlay(v);
    // Your turn
    const myTurn = !!v.legal;
    if (G.auto) { if (G.turnFlash) { TitleFlash.stop(); G.turnFlash = false; } if (v.status === 'ended' && !G.ended) showEnded(isHost ? 'You ended the game.' : 'The host ended the game.'); return; }
    if (myTurn && !(prev && prev.legal)) {
      const L = v.legal;
      if (G.pre) {
        const p = G.pre; G.pre = null;
        const a = p === 'checkfold' ? (L.canCheck ? 'check' : 'fold') : p === 'callany' ? (L.canCheck ? 'check' : 'call') : (L.canCheck ? 'check' : null);
        if (a) { setTimeout(() => act(a), 250); return; }
      }
      Sound.play('chime');
      TitleFlash.stop(); TitleFlash.start('● Your turn · Feltroom'); G.turnFlash = true;
      announce(`Your turn. ${L.canCheck ? 'You can check.' : U.fmt(L.toCall) + ' to call.'}`);
    }
    if (!myTurn && G.turnFlash) { TitleFlash.stop(); G.turnFlash = false; }
    if (v.status === 'ended' && !G.ended) showEnded(isHost ? 'You ended the game.' : 'The host ended the game.');
  }

  // A session can outlive this screen (a rematch closes the old table a moment later), so a closed screen ignores it.
  const live = (fn) => (...a) => { if (!G.dead) fn(...a); };
  session.on('view', live(update));
  session.on('event', live((kind, text) => { if (!(kind === 'info' && G.view && G.view.table.botSpeed === 'instant')) toast(text, kind); }));
  session.on('error', live((text) => { toast(text, 'error'); G.sending = false; G.barKey = null; if (G.view) renderBar(); }));
  session.on('ended', live((reason) => showEnded(reason)));
  session.on('rematch', live(() => showRematchCard()));
  if (session.rematch) setTimeout(showRematchCard, 0);
  if (session.offline && session.table && session.table.s.botSpeed === 'instant') setAuto(true);
  session.on('fair', live((f, msg) => {
    if (G.alerted !== f.no) { G.alerted = f.no; toast(`Fair-play check failed on hand #${f.no}: ${msg}`, 'error', 9000); announce('Warning: fair play check failed.'); }
    renderFairBadge();
  }));
  if (session.on && !isHost) session.on('status', live((st) => { G.status = st; if (G.view) update(G.view); }));

  /* ----- keyboard ----- */
  function onKey(e) {
    if ($('.modal-back')) return;
    const t = e.target, tag = t.tagName;
    const typing = (tag === 'INPUT' && !['checkbox', 'range', 'radio'].includes(t.type)) || tag === 'TEXTAREA';
    const L = G.view && G.view.legal;
    if (typing) {
      if (t.id === 'ab-amt') {
        if (e.key === 'Enter') { e.preventDefault(); setAmt(t.value); act('raise'); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setAmt((amtNow() || 0) + (e.key === 'ArrowUp' ? 1 : -1) * G.view.table.bb); }
        else if (e.key === 'Escape') t.blur();
      }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === '?') { e.preventDefault(); return helpOverlay('game'); }
    if (k === 'm') { Sound.toggle(); soundBtn(); return; }
    if (k === 'a' && !isWatcher && G.view && G.view.you && G.view.you.seat != null && !G.ended) { e.preventDefault(); setAuto(!G.auto); return; }
    if (!L) return;
    if (k === 'f') { e.preventDefault(); act('fold'); }
    else if (k === 'c') { e.preventDefault(); act(L.canCheck ? 'check' : 'call'); }
    else if (k === 'r' && L.canRaise) { e.preventDefault(); const i = $('#ab-amt'); if (i) { i.focus(); i.select(); } }
    else if (L.canRaise && (k === 'ArrowUp' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'ArrowLeft')) {
      e.preventDefault();
      setAmt((amtNow() || 0) + (k === 'ArrowUp' || k === 'ArrowRight' ? 1 : -1) * G.view.table.bb);
    } else if (k === 'Enter' && L.canRaise && t.id === 'ab-range') { e.preventDefault(); act('raise'); }
  }
  addEventListener('keydown', onKey);
  const onResize = () => { if (!mobile() && side.classList.contains('collapsed') && Prefs.get('panelOpen', true) && !G.userClosed) { /* keep user choice */ } };
  addEventListener('resize', onResize);

  if (isHost) session.table.changed();
  else if (session.lastView) update(session.lastView);
  return {
    destroy() { G.dead = true; removeEventListener('keydown', onKey); removeEventListener('resize', onResize); table.destroy(); closeMenu(); hideRematchCard(); TitleFlash.stop(); },
  };
}
