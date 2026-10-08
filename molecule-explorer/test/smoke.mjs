/* Opens the built file from file:// with the network switched off and checks
 * that every offline feature actually works in a real browser. */
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const FILE = 'file://' + path.resolve('dist/molecule-explorer.html');
const SHOTS = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-Aidanbehar/599462a2-a79b-540a-93a2-adc4ca3b1ef8/scratchpad/shots';
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log('  ✓ ' + name); }
  else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); console.log('  ✖ ' + name + (detail ? ' — ' + detail : '')); }
}

const EXEC = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
/* Honour an outbound proxy when the machine has one; on an ordinary machine
 * there is none and this is simply omitted. */
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || null;
const browser = await chromium.launch({
  executablePath: fs.existsSync(EXEC) ? EXEC : undefined,
  args: [
    '--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    /* Some CI machines route outbound HTTPS through a TLS-terminating proxy.
     * Trusting that one certificate by its public-key hash keeps normal
     * certificate checking on for every other host. Test-only; the app itself
     * never sees this. */
    ...(process.env.TEST_PROXY_CA_SPKI ? ['--ignore-certificate-errors-spki-list=' + process.env.TEST_PROXY_CA_SPKI] : []),
  ],
  proxy: PROXY ? { server: PROXY } : undefined,
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
/* setOffline is what makes navigator.onLine false; route-blocking alone does
 * not, and the app keys its "you are offline" behaviour off navigator.onLine. */
await ctx.setOffline(true);

/* Block every network request: the page must not need one. */
const attempted = [];
await ctx.route('**/*', (route) => {
  const url = route.request().url();
  if (url.startsWith('file://') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
  attempted.push(url);
  return route.abort();
});

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  /* A blocked request logs a resource error in the console; that is the network
   * being off, not the app misbehaving. */
  if (/Failed to load resource/.test(m.text())) return;
  errors.push('console: ' + m.text());
});

console.log('\nLoading ' + FILE);
await page.goto(FILE, { waitUntil: 'load' });
await page.waitForTimeout(1200);

check('page loads with no script errors', errors.length === 0, errors.slice(0, 3).join(' | '));
check('no network requests attempted on load', attempted.length === 0, attempted.slice(0, 3).join(', '));
const tabNames = (await page.locator('.nav .tab').allInnerTexts()).join('|');
check('navigation rendered', await page.locator('.nav .tab').count() >= 11, tabNames);
/* The order is part of the spec: the three playable tabs — Balancer, Gas
   Simulator and Reactions — go immediately after Elements, Gallery and Search
   come near the end, and Quantum is deliberately last because it is the one
   tab that belongs to no part of the course. */
check('the tabs are in the order the app promises',
  tabNames === 'Learn|Draw|Elements|Balancer|Gas Simulator|Reactions|Tools|Reference|Gallery|Search|Quantum',
  tabNames);
/* Eleven tabs plus the search box must not push the nav onto a second row on a
   laptop, which is what dropped the search box below the tabs once. */
const navFits = await page.evaluate(() => {
  const inner = document.querySelector('.nav-inner');
  const tabs = document.querySelector('.tabs').getBoundingClientRect();
  const box = document.querySelector('.searchbox').getBoundingClientRect();
  /* The theme button is the last thing in the bar, and it is the one that
     wrapped onto a row of its own when the eleventh tab arrived — so the
     check includes it rather than only the search box. */
  const last = inner.lastElementChild.getBoundingClientRect();
  return {
    oneRow: Math.abs(tabs.top - box.top) < 8 && Math.abs(tabs.top - last.top) < 10,
    height: Math.round(inner.getBoundingClientRect().height),
  };
});
check('the nav stays on one row', navFits.oneRow, JSON.stringify(navFits));
check('and the bar is still one row tall', navFits.height < 70, JSON.stringify(navFits));
check('Learn is the default view', await page.locator('#view-learn.active').count() === 1);

/* ---------------------------------------------------------- course map */
/* #/learn is the course map now, not lesson one. */
/* Counted from the app rather than pinned, so adding a lesson does not mean
   editing a pile of literals in here. */
const QTOTAL = await page.evaluate(() => window.ME.course.allLessons()
  .reduce((n, l) => n + window.ME.course.questionsOf(l).length, 0));
const courseTotals = await page.evaluate(() => ({
  units: window.ME.course.units.length,
  lessons: window.ME.course.allLessons().length,
  questions: window.ME.course.allLessons()
    .reduce((n, l) => n + window.ME.course.questionsOf(l).length, 0),
}));
check('the course map lists every unit',
  await page.locator('.cm-unit').count() === courseTotals.units, JSON.stringify(courseTotals));
check('the course map lists every lesson',
  await page.locator('.cm-lesson').count() === courseTotals.lessons, JSON.stringify(courseTotals));
check('every unit shows a progress bar and an estimated time',
  await page.locator('.cm-unit-bar i').count() === courseTotals.units &&
  await page.locator('.cm-unit-time').count() === courseTotals.units);
check('the map offers somewhere to start', await page.locator('.cm-resume').count() === 1,
  await page.locator('.cm-resume').innerText());
check('the organic lessons are still there, as their own unit',
  await page.evaluate(() => window.ME.learn.LESSONS.length >= 12 &&
    window.ME.learn.LESSONS.some((l) => l.id === 'unsaturation')));
await page.screenshot({ path: path.join(SHOTS, '01-course-map.png'), fullPage: false });

/* ------------------------------------------------------- lesson reader */
/* Open a long-form lesson and walk it. */
await page.locator('.cm-lesson').first().click();
await page.waitForTimeout(400);
check('a lesson opens with its hook', await page.locator('.ls-hook').count() === 1);
check('and says which unit it belongs to',
  /UNIT 1/i.test(await page.locator('.ls-kicker').innerText()),
  await page.locator('.ls-kicker').innerText());
const pageCount = await page.locator('.ls-dot').count();
check('a long lesson is broken into pages', pageCount >= 3, 'pages: ' + pageCount);
check('it starts on the first page',
  /PART 1 OF/i.test(await page.locator('.ls-page-n').innerText()));
check('it has a common-mistakes section', await page.locator('.ls-mistake').count() >= 3);
check('it has a plain-words recap', await page.locator('.ls-recap p').count() >= 3);
/* a checkpoint sits between pages, not all at the end */
await page.locator('.ls-dot').nth(1).click();
await page.waitForTimeout(300);
check('a checkpoint appears part-way through, not only at the end',
  await page.locator('.quiz-checkpoint').count() === 1);
await page.locator('.quiz-checkpoint .quiz-opt').first().click();
await page.waitForTimeout(250);
check('the checkpoint grades itself', await page.locator('.quiz-checkpoint .callout.ok').count() === 1);
/* the new question types */
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(200);
check('a sort-into-categories question rendered', await page.locator('.quiz-sort-bin').count() >= 2);
const poolBefore = await page.locator('.quiz-sort-pool .quiz-sort-item').count();
await page.locator('.quiz-sort-item').first().click();
await page.waitForTimeout(150);
check('a sort item can be moved without dragging',
  await page.locator('.quiz-sort-pool .quiz-sort-item').count() === poolBefore - 1);
await page.locator('.ls-crumb').click();
await page.waitForTimeout(300);
check('progress from the checkpoint reached the map',
  /^1 of /.test(await page.locator('.progress-row .note').first().innerText()),
  await page.locator('.progress-row .note').first().innerText());

/* an order question, in lesson 1.2 */
await page.locator('.cm-lesson').nth(1).click();
await page.waitForTimeout(400);
check('a drag-to-order question rendered', await page.locator('.quiz-order-item').count() === 4);
await page.locator('.ls-crumb').click();
await page.waitForTimeout(300);

/* --------------------------------------------- the original 12 lessons */
/* These were written before the course existed and are still the same
   lessons, in the same format, so their behaviour is pinned here. */
const organicUnit = page.locator('.cm-unit', { hasText: 'Organic chemistry: reading structures' });
await organicUnit.locator('.cm-lesson').first().click();
await page.waitForTimeout(400);
check('the first organic lesson still renders', (await page.locator('.lesson h2').innerText()).includes('Why draw'),
  await page.locator('.lesson h2').innerText());
check('lesson figures drew molecules', await page.locator('#view-learn svg.molcanvas').count() >= 2);
check('it shows its set of questions', await page.locator('.quiz-item').count() === 3,
  'got ' + (await page.locator('.quiz-item').count()));
await page.locator('.quiz-item').nth(0).locator('.quiz-opt').nth(1).click();
await page.waitForTimeout(250);
check('quiz accepts the right answer', await page.locator('.quiz-feedback.show .callout.ok').count() === 1);
check('the set keeps a running tally', /1 \/ 3/.test(await page.locator('.quiz-tally').innerText()),
  await page.locator('.quiz-tally').innerText());
{
  const q2 = page.locator('.quiz-item').nth(1);
  await q2.locator('.quiz-opt').nth(1).click();
  await page.waitForTimeout(200);
  const msg = await q2.locator('.quiz-feedback').innerText();
  check('a wrong option explains that option', /Ethanol is a liquid and dimethyl ether is a gas/i.test(msg), msg.slice(0, 90));
  const left = await q2.locator('.quiz-opt:not([disabled])').count();
  check('the question stays open after a wrong answer', left === 3, left + ' options left');
}
{
  /* a wrong count should say which way you are out, plus a hint for that number */
  await page.locator('.ls-crumb').click();
  await page.waitForTimeout(250);
  await organicUnit.locator('.cm-lesson').nth(4).click();
  await page.waitForTimeout(350);
  const cq = page.locator('.quiz-item').nth(0);
  await cq.locator('input[type=number]').fill('4');
  await cq.locator('button', { hasText: 'Check' }).click();
  await page.waitForTimeout(200);
  const msg = await cq.locator('.quiz-feedback').innerText();
  check('a wrong count says which way it is out', /^Too few/.test(msg), msg.slice(0, 60));
  check('a wrong count names the actual mistake', /corners only/i.test(msg), msg.slice(0, 90));
}
{
  /* a wrong click should describe the atom that was clicked */
  await page.locator('.ls-crumb').click();
  await page.waitForTimeout(250);
  await organicUnit.locator('.cm-lesson').nth(5).click();
  await page.waitForTimeout(450);
  const aq = page.locator('.quiz-item').nth(0);
  await aq.locator('.clickmol .hit').nth(0).click();
  await page.waitForTimeout(200);
  const msg = await aq.locator('.quiz-feedback').innerText();
  check('a wrong click describes what was clicked', /That carbon has (one|two|three|four) line/i.test(msg), msg.slice(0, 90));
}
await page.locator('.ls-crumb').click();
await page.waitForTimeout(200);

/* Walk every lesson in the whole course, page by page, to be sure none of
   them throws. This is the check that catches a typo in lesson content. */
const lessonIds = await page.evaluate(() => window.ME.course.allLessons().map((l) => l.id));
for (const id of lessonIds) {
  await page.evaluate((x) => window.ME.learn.showLesson(x), id);
  await page.waitForTimeout(120);
  /* click through every page of a long-form lesson too */
  const dots = await page.locator('.ls-dot').count();
  for (let d = 1; d < dots; d++) {
    await page.locator('.ls-dot').nth(d).click();
    await page.waitForTimeout(70);
  }
}
check('every lesson in the course renders without error, on every page',
  errors.length === 0, errors.slice(0, 3).join(' | '));
check('and the course covers more than the original twelve',
  lessonIds.length > 12, lessonIds.length + ' lessons');
await page.evaluate(() => window.ME.learn.showMap());
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(SHOTS, '02-lesson-caffeine.png') });

/* --------------------------------------------------------------- search */
await page.fill('.searchbox input', 'caffiene');
await page.waitForTimeout(350);
const sugg = await page.locator('.suggest-item .nm').first().innerText();
check('typo "caffiene" suggests Caffeine', sugg.toLowerCase().includes('caffeine'), sugg);
await page.screenshot({ path: path.join(SHOTS, '03-suggest.png') });

await page.locator('.suggest-item').first().click();
await page.waitForTimeout(900);
check('molecule page opens', await page.locator('#view-molecule.active h1').count() === 1);
check('molecule page title is Caffeine', (await page.locator('#view-molecule h1').innerText()) === 'Caffeine');

const repTitles = await page.locator('#view-molecule .rep h3').allInnerTexts();
check('all representation cards present',
  ['Molecular formula', 'Condensed formula', 'Full structural formula', 'Skeletal', '3D shape', 'Functional groups', 'Machine-readable'].every(
    (t) => repTitles.some((r) => r.includes(t))), repTitles.join(' / '));
check('formula shown with subscripts', (await page.locator('.formula-big').first().innerHTML()).includes('<sub>'));
check('functional groups detected', await page.locator('.fg-item').count() > 0);
check('3D viewer produced a canvas', await page.locator('.viewer3d canvas').count() > 0);
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(SHOTS, '04-caffeine.png'), fullPage: true });

/* X-ray slider */
const before = await page.locator('#view-molecule .xray-holder svg').first().innerHTML();
await page.locator('#view-molecule .xray input[type=range]').first().fill('100');
await page.waitForTimeout(250);
const after = await page.locator('#view-molecule .xray-holder svg').first().innerHTML();
check('X-ray slider changes the drawing', before !== after);
check('full view shows hydrogens', (after.match(/>H</g) || []).length > 4, (after.match(/>H</g) || []).length + ' H labels');
await page.screenshot({ path: path.join(SHOTS, '05-xray-full.png') });

/* offline notice in the online section */
await page.fill('.searchbox input', 'zzzznotreal');
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
const searchText = await page.locator('#view-search').innerText();
check('search view marks the PubChem section', /search online \(pubchem\)/i.test(searchText), searchText.slice(0, 160));
check('offline is explained gracefully, not as a failure',
  /you are offline/i.test(searchText), searchText.slice(0, 260));
check('offline notice says the rest still works',
  /works exactly the same|built into this page|part of this file/i.test(searchText));
await page.screenshot({ path: path.join(SHOTS, '06-search-offline.png'), fullPage: true });

/* inorganic molecule: skeletal should be skipped with a reason */
await page.fill('.searchbox input', 'table salt');
await page.waitForTimeout(400);
const saltSugg = await page.locator('.suggest-item .nm').first().innerText();
check('synonym "table salt" finds sodium chloride', saltSugg.toLowerCase().includes('sodium chloride'), saltSugg);
await page.locator('.suggest-item').first().click();
await page.waitForTimeout(800);
const saltText = await page.locator('#view-molecule').innerText();
check('inorganic badge shown', saltText.includes('Inorganic'));
check('skeletal view explained away for a salt', /no carbon-carbon backbone|shortcut for carbon chains/i.test(saltText));
await page.screenshot({ path: path.join(SHOTS, '07-salt.png'), fullPage: true });

/* ------------------------------------------------------- the new tabs */
/* Balancer: a name typed instead of a formula, which is the case that broke
   once - "oxygen" resolved to a lone O atom and balanced CH4 + 4O -> CO2 +
   2H2O, which is arithmetically perfect and chemically nonsense. */
await page.locator('.tab[data-view=balancer]').click();
await page.waitForTimeout(350);

/* The live preview, which read "nullH2 + nullO2 -> nullH2O" once. A freshly
   parsed species carries a null coefficient when no number was typed, which
   is the ordinary case, and null passes both an !== undefined and an !== 1
   test. Checked here against several equations, because the bug only showed
   on the species the reader had left bare. */
for (const typed of ['H2 + O2 -> H2O', 'CH4 + 2 O2 -> CO2 + 2 H2O',
                     'Fe + O2 -> Fe2O3', 'NaOH + HCl -> NaCl + H2O']) {
  await page.locator('.bal-input').fill(typed);
  await page.waitForTimeout(320);
  const preview = await page.locator('.bal-preview').innerText();
  check('balancer preview has no null or undefined in it: ' + typed,
    !/\b(null|undefined|NaN)\b/.test(preview), preview.replace(/\n/g, ' '));
}
/* And a coefficient the reader did type is still shown. */
await page.locator('.bal-input').fill('2 H2 + O2 -> 2 H2O');
await page.waitForTimeout(320);
const typedPreview = (await page.locator('.bal-preview').innerText()).replace(/\s+/g, '');
check('balancer preview keeps a coefficient that was typed',
  typedPreview === '2H2+O2\u21922H2O', typedPreview);

await page.locator('.bal-input').fill('methane + oxygen -> carbon dioxide + water');
await page.waitForTimeout(300);
await page.locator('.bal-actions .btn-primary').click();
await page.waitForTimeout(350);
const balAnswer = (await page.locator('.bal-answer .bal-eq.big').innerText()).replace(/\s+/g, '');
check('balancer accepts names and uses the molecular form of an element',
  balAnswer === 'CH4+2O2\u2192CO2+2H2O', balAnswer);
check('balancer names the reaction type',
  (await page.locator('.chip-type').innerText()) === 'Combustion',
  await page.locator('.chip-type').innerText());
check('balancer atom table is all green',
  await page.locator('.bal-table tr.bad').count() === 0);
check('balancer shows the mass check', await page.locator('.bal-mass.ok').count() === 1);
check('balancer shows the mole ratios', await page.locator('.bal-ratio').count() >= 4);
await page.locator('.bal-answer-acts .btn', { hasText: 'Show me how' }).click();
await page.waitForTimeout(250);
check('balancer walkthrough has real steps', await page.locator('.bal-steps li').count() >= 5);
await page.locator('.bal-answer-acts .btn', { hasText: 'Let me try' }).click();
await page.waitForTimeout(250);
check('try-it mode gives a stepper per substance', await page.locator('.bal-stepper').count() === 4);
check('try-it mode says what is wrong',
  /hydrogen|oxygen|carbon/.test(await page.locator('.bal-try-feedback').innerText()),
  await page.locator('.bal-try-feedback').innerText());
await page.locator('.bal-try-acts .btn', { hasText: 'Show me the answer' }).click();
await page.waitForTimeout(250);
check('try-it mode recognises the finished answer', await page.locator('.bal-try.solved').count() === 1);
await page.screenshot({ path: path.join(SHOTS, '09-balancer.png') });

/* an equation that cannot be balanced must explain itself, not error */
await page.locator('.bal-input').fill('CH4 + O2 -> CO2');
await page.locator('.bal-actions .btn-primary').click();
await page.waitForTimeout(300);
check('an unbalanceable equation is explained',
  /appears only on the left/.test(await page.locator('.bal-fail-why').innerText()),
  await page.locator('.bal-fail-why').innerText());

/* Gas Simulator */
await page.locator('.tab[data-view=gas]').click();
await page.waitForTimeout(900);
check('gas simulator drew its box', await page.evaluate(() => {
  const c = document.querySelector('.gs-canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let painted = 0;
  for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) painted++;
  return painted > 200;
}));
check('gas simulator has all four variables', await page.locator('.gs-ctrl').count() === 4);
/* The state has three degrees of freedom, so a hand-written set of four
   numbers will not satisfy the law. It did not, by 1.4%, on the first frame. */
check('the gas obeys its own law exactly', await page.evaluate(() => {
  const s = window.ME.gassim.state.si, R = window.ME.fmt.CONST.R;
  return Math.abs(s.P * s.V - s.n * R * s.T) / (s.P * s.V) < 1e-12;
}));
await page.locator('.gs-law', { hasText: "Boyle's law" }).click();
await page.waitForTimeout(250);
check("Boyle's law holds temperature and amount", await page.evaluate(() =>
  window.ME.gassim.state.hold.T && window.ME.gassim.state.hold.n &&
  !window.ME.gassim.state.hold.P && !window.ME.gassim.state.hold.V));
/* changing a display unit must not change the gas */
const gasBefore = await page.evaluate(() => JSON.stringify(window.ME.gassim.state.si));
await page.locator('.gs-ctrl[data-var=T] .gs-unit').selectOption('F');
await page.waitForTimeout(300);
check('changing a unit only changes the display, never the gas',
  (await page.evaluate(() => JSON.stringify(window.ME.gassim.state.si))) === gasBefore);
check('and the number shown converts',
  (await page.locator('.gs-ctrl[data-var=T] .gs-num').inputValue()) === '68',
  await page.locator('.gs-ctrl[data-var=T] .gs-num').inputValue());
await page.locator('.gs-ctrl[data-var=T] .gs-unit').selectOption('C');
await page.waitForTimeout(200);
/* every scenario must also be self-consistent */
const presetCount = await page.locator('.gs-preset').count();
let presetsOk = true;
for (let i = 0; i < presetCount; i++) {
  await page.locator('.gs-preset').nth(i).click();
  await page.waitForTimeout(160);
  const off = await page.evaluate(() => {
    const s = window.ME.gassim.state.si, R = window.ME.fmt.CONST.R;
    return Math.abs(s.P * s.V - s.n * R * s.T) / (s.P * s.V);
  });
  if (off > 1e-9) presetsOk = false;
}
check('every scenario preset obeys the gas law too', presetsOk && presetCount >= 5, 'presets: ' + presetCount);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(SHOTS, '10-gas.png') });

/* The animations are findable from the search bar, by the name of the thing
 * rather than by the name of a molecule in it. */
await page.fill('.searchbox input', 'thermite');
await page.waitForTimeout(500);
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
const rxSearchText = await page.locator('#view-search').innerText();
check('searching for a reaction finds its animation',
  /Thermite/i.test(rxSearchText), rxSearchText.slice(0, 180));
await page.locator('#view-search .res', { hasText: 'Thermite' }).first().click();
await page.waitForTimeout(700);
check('and clicking it opens the reactions tab on that reaction',
  (await page.locator('.rx-navbtn.on').innerText()) === 'Thermite',
  await page.locator('.rx-navbtn.on').innerText().catch(() => 'nothing selected'));
await page.fill('.searchbox input', '');

/* Reactions */
await page.locator('.tab[data-view=reactions]').click();
await page.waitForTimeout(700);
/* The search check above left this tab on thermite, so say which one. */
await page.locator('.rx-navbtn', { hasText: 'Natural gas burning' }).click();
await page.waitForTimeout(500);
check('the reaction list is there, in groups',
  (await page.locator('.rx-navbtn').count()) >= 20 && (await page.locator('.rx-group').count()) >= 4,
  (await page.locator('.rx-navbtn').count()) + ' reactions in '
    + (await page.locator('.rx-group').count()) + ' groups');

/* Counting painted pixels is the only way to know a canvas drew anything;
 * a blank one throws nothing and reads as a perfectly fine element. */
const painted = (sel) => page.evaluate((s) => {
  const c = document.querySelector(s);
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, minX = 1e9, maxX = -1e9;
  for (let y = 0; y < c.height; y += 3) for (let x = 0; x < c.width; x += 3) {
    if (d[(y * c.width + x) * 4 + 3] > 12) { n++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  }
  return { n: n, spread: (maxX - minX) / c.width };
}, sel);

const first = await painted('.rx-canvas');
check('the first reaction draws something', first.n > 200, JSON.stringify(first));
check('and it is spread across the stage rather than piled in one spot',
  first.spread > 0.3, 'spread ' + first.spread.toFixed(2));

const eq = await page.locator('.rx-eqtext').innerText();
check('the balanced equation is shown above it', /CH4\s*\+\s*2O2/.test(eq.replace(/\u2082|\u2084/g, (m) => m === '\u2082' ? '2' : '4')), eq);
check('and the energy comes from the thermochemistry table',
  /890/.test(await page.locator('.rx-energy').innerText()),
  await page.locator('.rx-energy').innerText());

/* Scrub to the middle of the rearrangement and check the picture changed. */
const setT = (v) => page.evaluate((x) => {
  const s = document.querySelector('.rx-scrub');
  s.value = String(Math.round(x * 1000));
  s.dispatchEvent(new Event('input', { bubbles: true }));
}, v);
await setT(0.5);
await page.waitForTimeout(250);
const mid = await painted('.rx-canvas');
check('dragging the scrubber moves the animation', mid.n !== first.n,
  first.n + ' painted at the start, ' + mid.n + ' in the middle');
check('and dragging it pauses playback',
  (await page.locator('.rx-controls .btn-primary').innerText()) === 'Play',
  await page.locator('.rx-controls .btn-primary').innerText());

await setT(0.68);
await page.waitForTimeout(250);
check('the caption follows the phase',
  /stronger|heat/.test(await page.locator('.rx-caption').innerText()),
  await page.locator('.rx-caption').innerText());

/* A reaction whose energy the table cannot supply must say so, not imply none. */
await page.locator('.rx-navbtn', { hasText: 'A precipitate appearing' }).click();
await page.waitForTimeout(500);
check('a precipitation reaction draws too',
  (await painted('.rx-canvas')).n > 150);
const noE = await page.locator('.rx-energy').innerText();
check('and says why no energy figure is shown rather than showing none',
  /No energy figure/.test(noE) && /formation-enthalpy table/.test(noE), noE || '(empty)');

/* Leaving the tab has to stop the loop; an animation running behind a hidden
 * view is a flat battery with nobody watching. */
await page.locator('.tab[data-view=tools]').click();
await page.waitForTimeout(400);
check('leaving the tab stops the animation',
  await page.evaluate(() => window.ME.reactionsim.state.raf === null),
  'raf ' + await page.evaluate(() => String(window.ME.reactionsim.state.raf)));
await page.locator('.tab[data-view=reactions]').click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(SHOTS, '12-reactions.png'), fullPage: true });

/* Tools */
await page.locator('.tab[data-view=tools]').click();
await page.waitForTimeout(450);
check('tools are listed', await page.locator('.tl-navbtn').count() >= 15);
check('the first tool shows an answer straight away',
  (await page.locator('.tl-headline').innerText()).indexOf('g/mol') > 0,
  await page.locator('.tl-headline').innerText());
check('and shows its working', await page.locator('.tl-steps li').count() >= 2);
await page.locator('.tl-navbtn', { hasText: 'Stoichiometry' }).click();
await page.waitForTimeout(350);
check('stoichiometry draws the grams-moles-moles-grams road map',
  await page.locator('.tl-rm-step').count() === 4);
await page.locator('.tl-navbtn', { hasText: 'Limiting reactant' }).click();
await page.waitForTimeout(350);
check('limiting reactant names the one that runs out',
  /runs out first/.test(await page.locator('.tl-headline').innerText()),
  await page.locator('.tl-headline').innerText());
await page.screenshot({ path: path.join(SHOTS, '11-tools.png') });

/* Reaction energy. The engine tests pin the numbers; what matters here is
 * that a reader who clicks a chip gets those numbers on screen, with nothing
 * left as a blank or a NaN by the time it reaches the page. */
await page.locator('.tl-navbtn', { hasText: 'Reaction energy' }).click();
await page.waitForTimeout(400);
const reTemplates = await page.locator('.tl-template').count();
const reGroups = await page.locator('.tl-templates-group').count();
check('the reaction energy tool offers plenty of templates, in groups',
  reTemplates >= 20 && reGroups >= 4, reTemplates + ' templates in ' + reGroups + ' groups');

await page.locator('.tl-template', { hasText: 'Methane' }).first().click();
await page.waitForTimeout(400);
let reHead = await page.locator('.tl-headline').innerText();
check('burning methane shows the textbook figure',
  /Releases/i.test(reHead) && /890/.test(reHead), reHead);
check('and shows the working, not just the answer',
  await page.locator('.tl-steps li').count() >= 3);

/* Ten grams is well under a mole, so the energy has to come down with it. */
await page.locator('#view-tools .tl-input').nth(2).fill('10');
await page.selectOption('#view-tools .tl-select', 'g');
await page.waitForTimeout(500);
let scaled = await page.locator('.tl-headline').innerText();
check('a smaller amount of fuel releases proportionally less',
  /Releases/i.test(scaled) && /55[0-9]/.test(scaled.replace(/,/g, '')), scaled);

await page.locator('.tl-template', { hasText: 'Photosynthesis' }).first().click();
await page.waitForTimeout(400);
const endo = await page.locator('.tl-headline').innerText();
check('an endothermic reaction says it absorbs rather than releases',
  /Absorbs/i.test(endo) && !/Releases/i.test(endo), endo);

/* Every chip, clicked for real. A template that silently errors would be
 * worse than no template, because it reads as the tool being broken. */
const everyChip = await page.evaluate(async () => {
  const chips = Array.from(document.querySelectorAll('.tl-template'));
  const bad = [];
  for (const chip of chips) {
    chip.click();
    await new Promise((r) => setTimeout(r, 0));
    const head = document.querySelector('.tl-headline');
    const err = document.querySelector('.tl-out .callout.warn');
    const text = head ? head.innerText : '';
    if (err || !head || !/kJ/.test(text) || /NaN|undefined|null/.test(text)) {
      bad.push(chip.innerText.trim() + ' -> ' + (err ? err.innerText : text));
    }
  }
  return { count: chips.length, bad: bad };
});
check('every reaction energy template gives a real answer when clicked',
  everyChip.bad.length === 0 && everyChip.count >= 20,
  everyChip.count + ' chips, bad: ' + everyChip.bad.join(' | '));

/* Stoichiometry templates */
await page.locator('.tl-navbtn', { hasText: 'Stoichiometry' }).click();
await page.waitForTimeout(400);
const stTemplates = await page.locator('.tl-template').count();
check('stoichiometry has templates too', stTemplates >= 15, stTemplates + ' templates');
const everyStoich = await page.evaluate(async () => {
  const chips = Array.from(document.querySelectorAll('.tl-template'));
  const bad = [];
  for (const chip of chips) {
    chip.click();
    await new Promise((r) => setTimeout(r, 0));
    const head = document.querySelector('.tl-headline');
    const err = document.querySelector('.tl-out .callout.warn');
    const text = head ? head.innerText : '';
    if (err || !head || !/\d/.test(text) || /NaN|undefined|null/.test(text)) {
      bad.push(chip.innerText.trim() + ' -> ' + (err ? err.innerText : text));
    }
  }
  return bad;
});
check('every stoichiometry template gives a real answer when clicked',
  everyStoich.length === 0, everyStoich.join(' | '));
await page.locator('.tl-template').first().click();
await page.waitForTimeout(350);
await page.locator('.tl-navbtn', { hasText: 'Reaction energy' }).click();
await page.waitForTimeout(400);
await page.locator('.tl-template', { hasText: 'Methane' }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(SHOTS, '11b-reaction-energy.png'), fullPage: true });



/* Mixing two solutions. The engine tests pin the pH values against textbook
 * answers; these check that a reader clicking through the page gets them. */
await page.locator('.tl-navbtn', { hasText: 'Mix two solutions' }).click();
await page.waitForTimeout(450);
const mixGroups = await page.locator('#view-tools optgroup').count();
check('the substance pickers are grouped by strong and weak',
  mixGroups >= 8, mixGroups + ' optgroups across the two pickers');
check('and the mixing tool has templates of its own',
  (await page.locator('.tl-template').count()) >= 20);

await page.locator('.tl-template', { hasText: 'Weak acid, halfway' }).click();
await page.waitForTimeout(500);
let mixHead = await page.locator('.tl-headline').innerText();
let mixSub = await page.locator('.tl-sub, .tl-out').first().innerText();
check('a half-neutralised weak acid comes out on its pKa',
  /pH 4\.76/.test(mixHead), mixHead);
check('and is named as a buffer', /buffer/i.test(mixSub), mixSub.slice(0, 120));
check('the working shows Henderson-Hasselbalch rather than asserting it',
  /Henderson/.test(await page.locator('.tl-steps').innerText()));

await page.locator('.tl-template', { hasText: 'dead level' }).click();
await page.waitForTimeout(500);
check('strong acid and strong base at the equivalence point give exactly 7.00',
  /pH 7\.00/.test(await page.locator('.tl-headline').innerText()),
  await page.locator('.tl-headline').innerText());

await page.locator('.tl-template', { hasText: 'not 7' }).first().click();
await page.waitForTimeout(500);
const notSeven = await page.locator('.tl-headline').innerText();
check('a weak acid at its equivalence point does NOT give 7',
  /pH 8\.73/.test(notSeven), notSeven);

await page.locator('.tl-template', { hasText: 'not pH 4' }).click();
await page.waitForTimeout(500);
const notFour = await page.locator('.tl-out').innerText();
check('mixing pH 3 and pH 5 gives 3.30, and says why it is not 4',
  /pH 3\.30/.test(notFour) && /not halfway/.test(notFour), notFour.slice(0, 160));
check('and warns that a typed pH is treated as a strong acid',
  /reservoir/.test(notFour), 'no warning about what a bare pH cannot tell you');
check('concentrations print with real superscripts, not 10^-4',
  /10[\u207b\u2070\u00b9\u00b2\u00b3\u2074-\u2079]/.test(notFour) && !/10\^/.test(notFour),
  notFour.slice(0, 200));
await page.screenshot({ path: path.join(SHOTS, '11c-mix-ph.png'), fullPage: true });

/* Clicking a tool in the side list swaps the panel out from under the reader.
 * The list is long enough to scroll past, so a reader picking something from
 * the bottom of it was left looking at the middle of a tool they had not
 * asked for, or at nothing at all.
 *
 * The clicks here go through the page rather than through Playwright, which
 * scrolls a button into view before clicking it — that would be the test
 * harness doing the very thing under test. */
const clickTool = (name) => page.evaluate((n) => {
  const b = Array.from(document.querySelectorAll('.tl-navbtn'))
    .filter((x) => x.innerText.indexOf(n) === 0)[0];
  b.click();
}, name);

await clickTool('Molar mass');
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(300);
const strandedAt = await page.evaluate(() => ({
  y: window.scrollY,
  top: document.querySelector('.tl-panel').getBoundingClientRect().top,
}));
check('a reader can scroll past the top of the tool panel',
  strandedAt.y > 400 && strandedAt.top < 0,
  'scrollY ' + strandedAt.y + ', panel top ' + strandedAt.top);

await clickTool('Reaction energy');
await page.waitForTimeout(1200);
const landed = await page.evaluate(() => ({
  y: window.scrollY,
  top: document.querySelector('.tl-panel').getBoundingClientRect().top,
  navH: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')),
  heading: document.querySelector('.tl-tool h2').innerText,
}));
check('picking another tool brings its top back into view',
  landed.y < strandedAt.y && landed.top >= landed.navH - 1 && landed.top < landed.navH + 40,
  'scrollY ' + strandedAt.y + ' -> ' + landed.y + ', panel top ' + landed.top);
check('and it is the tool that was picked', landed.heading === 'Reaction energy', landed.heading);

/* Already looking at the top of the panel: moving the page would be a jolt
 * with nothing gained. */
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await clickTool('Dilution');
await page.waitForTimeout(1000);
check('picking a tool while already at the top does not move the page',
  (await page.evaluate(() => window.scrollY)) === 0,
  'scrollY ' + (await page.evaluate(() => window.scrollY)));
await page.locator('.tl-navbtn', { hasText: 'Reaction energy' }).click();
await page.waitForTimeout(400);

/* Quantum */
await page.locator('.tab[data-view=quantum]').click();
await page.waitForTimeout(700);
check('the Schrödinger tab lists its pages',
  (await page.locator('.qm-navbtn').count()) >= 10,
  (await page.locator('.qm-navbtn').count()) + ' pages');

/* Every page, rendered for real. The engine tests check the prose has no
 * gaps; this checks the page actually goes on screen. */
const qmPages = await page.locator('.qm-navname').allInnerTexts();
const qmBad = [];
for (let i = 0; i < qmPages.length; i++) {
  await page.locator('.qm-navbtn').nth(i).click();
  await page.waitForTimeout(260);
  const t = await page.locator('.qm-page').innerText();
  if (t.length < 700 || /undefined|NaN/.test(t)) qmBad.push(qmPages[i] + ': ' + t.slice(0, 60));
}
check('every page renders with real content', qmBad.length === 0, qmBad.join(' | '));

await page.locator('.qm-navbtn', { hasText: 'TDSE and TISE' }).click();
await page.waitForTimeout(600);
const tiseText = await page.locator('.qm-page').innerText();
check('the TISE is derived rather than asserted',
  /separation/i.test(tiseText) && /both the same constant/i.test(tiseText), tiseText.slice(0, 120));
check('and it says what stationary actually means',
  /probability cloud it produces is completely frozen/i.test(tiseText));
check('and gives a table of which equation to use',
  (await page.locator('.qm-page table tr').count()) >= 5);

/* The stationary-state animation is the one figure this topic needs, so it
 * has to be painting something rather than sitting blank. */
const qmPainted = await page.evaluate(() => {
  const c = document.querySelector('.qm-canvas');
  if (!c) return { n: 0 };
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 12) n++;
  return { n: n };
});
check('the stationary-state figure is drawing', qmPainted.n > 100, JSON.stringify(qmPainted));

await page.locator('.qm-navbtn', { hasText: 'Doing it by hand' }).click();
await page.waitForTimeout(600);
const byHand = await page.locator('.qm-page').innerText();
check('the derivation shows the boundary conditions doing the work',
  /B = 0/.test(byHand) && /kL = n/.test(byHand) && /8mL/.test(byHand), byHand.slice(0, 120));
check('and the worked numbers are there', /0\.376/.test(byHand), 'no 0.376 eV in the worked example');
const slidersBefore = await page.locator('.qm-canvas').first().screenshot();
await page.locator('.qm-slider input[type=range]').first().fill('4');
await page.waitForTimeout(400);
const slidersAfter = await page.locator('.qm-canvas').first().screenshot();
check('dragging the level slider redraws the wave',
  Buffer.compare(slidersBefore, slidersAfter) !== 0, 'the canvas did not change');
check('and the energy readout followed it',
  /eV/.test(await page.locator('.qm-pill').first().innerText()),
  await page.locator('.qm-pill').first().innerText());

await page.locator('.qm-navbtn', { hasText: 'Problems' }).click();
await page.waitForTimeout(700);
check('the problems page generates a set',
  (await page.locator('.qm-problems .quiz-item').count()) >= 12,
  (await page.locator('.qm-problems .quiz-item').count()) + ' problems');
/* Answer one wrongly and one rightly, through the same grader the course uses. */
const firstNumeric = page.locator('.qm-problems .quiz-numinput').first();
await firstNumeric.fill('-999');
await firstNumeric.press('Enter');
await page.waitForTimeout(300);
check('a wrong answer is marked wrong',
  (await page.locator('.qm-problems .quiz-feedback .callout.warn').count()) >= 1);

/* Leaving the tab must stop the animation loop. */
await page.locator('.tab[data-view=tools]').click();
await page.waitForTimeout(400);
check('leaving the tab stops the animation',
  await page.evaluate(() => window.ME.quantumview.state.raf === null));
await page.locator('.tab[data-view=quantum]').click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(SHOTS, '13-quantum.png'), fullPage: true });

/* Reference */
await page.locator('.tab[data-view=reference]').click();
await page.waitForTimeout(400);
check('reference sections are listed', await page.locator('.rf-navbtn').count() >= 8);
check('the ion table says where it came from',
  /PubChem/.test(await page.locator('.rf-prov').innerText()),
  await page.locator('.rf-prov').innerText());
await page.locator('.rf-navbtn', { hasText: 'Acid and base strengths' }).click();
await page.waitForTimeout(400);
const pkaText = await page.locator('#view-reference').innerText();
check('the pKa table is listed with its values',
  /4\.76/.test(pkaText) && /9\.25/.test(pkaText) && /2\.15, 7\.2, 12\.35/.test(pkaText),
  pkaText.slice(0, 200));
check('and says a strong acid has no pKa at all',
  /strong/i.test(pkaText) && /no equilibrium left/.test(pkaText));
check('and says where the numbers came from',
  /Literature data/.test(pkaText));

const clickSection = (name) => page.evaluate((n) => {
  Array.from(document.querySelectorAll('.rf-navbtn'))
    .filter((x) => x.innerText.indexOf(n) === 0)[0].click();
}, name);
await clickSection('Specific heats');
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(300);
const refDown = await page.evaluate(() => window.scrollY);
await clickSection('Formation enthalpies');
await page.waitForTimeout(1200);
const refAfter = await page.evaluate(() => ({
  y: window.scrollY, top: document.querySelector('.rf-panel').getBoundingClientRect().top,
}));
check('picking a reference table brings its top back into view too',
  refDown > 400 && refAfter.y < refDown && refAfter.top > 0 && refAfter.top < 110,
  'scrollY ' + refDown + ' -> ' + refAfter.y + ', panel top ' + refAfter.top);

await page.locator('.rf-navbtn', { hasText: 'Glossary' }).click();
await page.waitForTimeout(250);
check('the glossary has entries', await page.locator('.rf-gloss-item').count() >= 40);
await page.locator('.rf-search').fill('mole');
await page.waitForTimeout(250);
const glossHits = await page.locator('.rf-gloss-item').count();
check('the glossary search narrows', glossHits > 0 && glossHits < 40, 'hits: ' + glossHits);
await page.locator('.rf-navbtn', { hasText: 'Activity series' }).click();
await page.waitForTimeout(250);
check('the activity series is in order and marks hydrogen',
  await page.locator('.rf-act.hydrogen').count() === 1);
await page.screenshot({ path: path.join(SHOTS, '12-reference.png') });

/* --------------------------------------------------------------- gallery */
await page.locator('.tab[data-view=gallery]').click();
await page.waitForTimeout(900);
const cards = await page.locator('.gal-card').count();
/* Counted from the database rather than pinned to a number that has to be
   edited every time the gallery grows. */
const galleryTotal = await page.evaluate(() => window.ME.search.gallery().length);
check('every gallery molecule has a card', cards === galleryTotal, cards + ' cards for ' + galleryTotal + ' molecules');
check('the gallery is a substantial collection', galleryTotal >= 400, 'got ' + galleryTotal);
check('gallery thumbnails drew', await page.locator('.gal-card .thumb svg').count() > 5);
/* The filter buttons carry their own counts, and each must match the data. */
const filterCounts = await page.evaluate(() => {
  const all = window.ME.search.gallery();
  const by = {};
  all.forEach((m) => { by[m.c] = (by[m.c] || 0) + 1; });
  return Array.from(document.querySelectorAll('.gal-filters .btn')).map((b) => ({
    cat: b.dataset.cat,
    shown: parseInt(b.querySelector('.gal-count').textContent, 10),
    real: b.dataset.cat === 'all' ? all.length : (by[b.dataset.cat] || 0),
  }));
});
check('every category is offered with a count', filterCounts.length >= 8, 'got ' + filterCounts.length);
check('no filter offers a category with nothing in it', filterCounts.every((f) => f.real > 0),
  JSON.stringify(filterCounts.filter((f) => !f.real)));
check('the counts on the filters are the real counts',
  filterCounts.every((f) => f.shown === f.real),
  JSON.stringify(filterCounts.filter((f) => f.shown !== f.real)));
await page.screenshot({ path: path.join(SHOTS, '08-gallery.png') });
for (const [label, key] of [['Medicines', 'medicine'], ['Psychoactive', 'psychoactive'],
  ['Household', 'household'], ['Plastics & materials', 'materials'],
  ['Inorganic', 'inorganic'], ['Lab & solvents', 'lab']]) {
  await page.locator('.gal-filters .btn', { hasText: label }).first().click();
  await page.waitForTimeout(220);
  const shown = await page.locator('.gal-card').count();
  const want = filterCounts.find((f) => f.cat === key).real;
  check(`the ${label} filter shows exactly its ${want} molecules`, shown === want, 'got ' + shown);
}

/* -------------------------------------------------------- periodic table */
await page.locator('.tab[data-view=elements]').click();
await page.waitForTimeout(700);
check('the periodic table shows all 118 elements', await page.locator('.pt-el').count() === 118,
  'got ' + (await page.locator('.pt-el').count()));
check('every category has a legend entry', await page.locator('.pt-legend-item').count() === 10);
check('an element is open by default', (await page.locator('.pt-detail h2').innerText()) === 'Carbon',
  await page.locator('.pt-detail h2').innerText());
check('the open element lists its numbers', await page.locator('.pt-fact').count() >= 10,
  (await page.locator('.pt-fact').count()) + ' facts');
{
  const txt = await page.locator('.pt-detail').innerText();
  check('carbon shows its electron configuration', /\[He\]2s2 2p2/.test(txt));
  check('carbon shows how many bonds it wants', /4 bonds/.test(txt));
  check('the bond count is explained, not just stated', /room for eight/i.test(txt), txt.slice(0, 200));
  check('carbon shows a plain-language note', /backbone of every molecule/i.test(txt));
  check('temperatures are given in celsius too', /\u00b0C\)/.test(txt), txt.slice(0, 120));
  check('there is a shell diagram', await page.locator('.orb-shells').count() === 1);
  check('the shells are labelled', /2 \u00b7 4 by shell/.test(txt), txt);
  check('the outer shell is called out', /4 in the outer shell/.test(txt));
  check('there are orbital boxes', await page.locator('.orb-row').count() === 3,
    (await page.locator('.orb-row').count()) + ' rows');
  check('the boxes hold six electrons for carbon',
    (await page.locator('.orb-up').count()) + (await page.locator('.orb-down').count()) === 6);
  check('orbital shapes are shown', await page.locator('.orb-panel').count() === 2);
  check('the orbital note explains what an orbital is', /cloud of probability/i.test(txt));
}

/* drag the p-orbital picture and confirm it turns */
{
  await page.locator('.orb-panel').nth(1).scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const svg = page.locator('.orb-panel').nth(1).locator('svg');
  const before = await svg.innerHTML();
  const bb = await page.locator('.orb-panel').nth(1).locator('.orb-3d').boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2 + 45, bb.y + bb.height / 2 + 25, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  check('the orbital picture turns when dragged', (await svg.innerHTML()) !== before);
}
check('molecules containing the element are linked', await page.locator('.pt-mol').count() > 0);

/* clicking another element swaps the panel */
await page.locator('.pt-el:has(.pt-sym:text-is("Fe"))').first().click();
await page.waitForTimeout(300);
check('clicking an element opens it', (await page.locator('.pt-detail h2').innerText()) === 'Iron',
  await page.locator('.pt-detail h2').innerText());
{
  const txt = await page.locator('.pt-detail').innerText();
  check('iron is labelled a transition metal', /Transition metal/.test(txt));
  check('iron lists the molecules it appears in', /Heme B/.test(txt), txt.slice(-160));
  check('iron says the simple bond rule does not apply', /It varies/.test(txt));
  check('and explains why', /d-block metal/i.test(txt), txt.slice(0, 300));
  check('iron shows its fourteen-electron third shell', /2 \u00b7 8 \u00b7 14 \u00b7 2/.test(txt), txt);
  check('iron shows d orbitals too', await page.locator('.orb-panel').count() === 3);
}
await page.screenshot({ path: path.join(SHOTS, '14-elements.png'), fullPage: true });

/* an element with almost no data still renders rather than breaking */
await page.locator('.pt-el:has(.pt-sym:text-is("Og"))').first().click();
await page.waitForTimeout(300);
check('a barely-studied element still renders',
  (await page.locator('.pt-detail h2').innerText()) === 'Oganesson' && await page.locator('.pt-fact').count() > 0);
check('and says plainly that nothing in the set contains it',
  /No built-in molecule contains oganesson/i.test(await page.locator('.pt-detail').innerText()));
check('a predicted configuration is marked as a prediction',
  /never been measured/i.test(await page.locator('.pt-detail').innerText()));

/* a molecule chip opens the molecule page */
await page.locator('.pt-el:has(.pt-sym:text-is("O"))').first().click();
await page.waitForTimeout(300);
await page.locator('.pt-mol').first().click();
await page.waitForTimeout(700);
check('a linked molecule opens its page', await page.locator('#view-molecule.active h1').count() === 1);

/* an alkali metal must not be described as wanting one covalent bond */
await page.evaluate(() => { location.hash = '#/elements/Na'; });
await page.waitForTimeout(400);
{
  const txt = await page.locator('.pt-detail').innerText();
  check('sodium is described as giving an electron away', /Gives away 1/.test(txt), txt.slice(0, 200));
  check('and not as making a bond', !/^1 bond/m.test(txt));
  check('sodium shows three shells', /2 \u00b7 8 \u00b7 1 by shell/.test(txt), txt);
}

/* deep links, by symbol and by atomic number */
for (const [frag, want] of [['Fe', 'Iron'], ['26', 'Iron'], ['Na', 'Sodium']]) {
  await page.evaluate((f) => { location.hash = '#/elements/' + f; }, frag);
  await page.waitForTimeout(350);
  check(`#/elements/${frag} opens ${want}`, (await page.locator('.pt-detail h2').innerText()) === want,
    await page.locator('.pt-detail h2').innerText());
}

/* ------------------------------------------------------------------ draw */
await page.locator('.tab[data-view=draw]').click();
await page.waitForTimeout(600);
check('draw canvas present', await page.locator('#drawCanvas').count() === 1);

const box = await page.locator('#drawCanvas').boundingBox();
/* draw ethanol: C, then C, then switch to O and add it */
await page.mouse.click(box.x + 260, box.y + 240);
await page.waitForTimeout(250);
await page.mouse.click(box.x + 260, box.y + 240);   /* grow the chain */
await page.waitForTimeout(250);
let info = await page.locator('.draw-side').innerText();
check('two carbons give C2H6', info.includes('C2H6') || info.includes('C₂H₆') || /C\s*2\s*H\s*6/.test(info), info.slice(0, 120));

await page.locator('.tool.el', { hasText: /^O$/ }).click();
const atoms = await page.evaluate(() => window.ME.draw.graph.atoms.length);
check('graph has two atoms before adding oxygen', atoms === 2, 'got ' + atoms);
await page.evaluate(() => {
  /* click the second carbon precisely, in model coordinates */
  const g = window.ME.draw.graph;
  window.__second = g.atoms[1];
});
await page.waitForTimeout(150);
/* place the oxygen by clicking the second atom (changes element) is wrong:
   instead grow a new atom from it using the model API the UI also uses */
await page.evaluate(() => {
  const ME = window.ME, M = ME.drawModel, g = ME.draw.graph;
  const ang = M.suggestAngle(g, 1);
  const ni = M.addAtom(g, g.atoms[1].x + Math.cos(ang), g.atoms[1].y + Math.sin(ang), 'O');
  M.addBond(g, 1, ni, 1);
  ME.draw.refresh();
});
await page.waitForTimeout(400);
info = await page.locator('.draw-side').innerText();
check('ethanol recognised from the drawing', info.includes('You drew Ethanol'), info.slice(0, 200));
await page.screenshot({ path: path.join(SHOTS, '09-draw-ethanol.png') });

/* Adding standalone atoms. A tap always wobbles a little — on a trackpad or a
   touchscreen, several pixels — and that must never be read as a drag, or every
   attempt to place a single atom produces a bonded pair instead. */
async function tapWithWobble(x, y, px) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (px) await page.mouse.move(x + px, y + px, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(220);
}
const drawState = () => page.evaluate(() => ({
  n: window.ME.draw.graph.atoms.length, b: window.ME.draw.graph.bonds.length,
}));
const clearDraw = () => page.evaluate(() => window.ME.draw.setGraph(window.ME.drawModel.emptyGraph()));

for (const wobble of [0, 5, 10, 15]) {
  await clearDraw();
  await page.waitForTimeout(120);
  await tapWithWobble(box.x + 330, box.y + 220, wobble);
  const st = await drawState();
  check(`a tap with ${wobble}px of wobble makes one lone atom`,
    st.n === 1 && st.b === 0, `got ${st.n} atoms and ${st.b} bonds`);
}

await clearDraw();
await page.waitForTimeout(120);
await page.mouse.move(box.x + 330, box.y + 220);
await page.mouse.down();
await page.mouse.move(box.x + 430, box.y + 220, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(250);
{
  const st = await drawState();
  check('a deliberate drag still makes a bond', st.n === 2 && st.b === 1,
    `got ${st.n} atoms and ${st.b} bonds`);
}

/* several separate atoms of different elements, none of them bonded */
await clearDraw();
await page.waitForTimeout(120);
/* an earlier step left a different element selected */
await page.locator('.draw-toolbar .tool.el', { hasText: /^C$/ }).click();
await page.mouse.click(box.x + 180, box.y + 150);
await page.waitForTimeout(180);
await page.locator('.draw-toolbar .tool.el', { hasText: /^O$/ }).click();
await page.mouse.click(box.x + 420, box.y + 150);
await page.waitForTimeout(180);
await page.locator('.draw-toolbar .tool.el', { hasText: /^N$/ }).click();
await page.mouse.click(box.x + 180, box.y + 330);
await page.waitForTimeout(300);
{
  const st = await drawState();
  const syms = await page.evaluate(() => window.ME.draw.graph.atoms.map((a) => a.sym).join(''));
  check('three separate atoms of different elements stay separate',
    st.n === 3 && st.b === 0 && syms === 'CON', `${syms}, ${st.n} atoms, ${st.b} bonds`);
}
const sep = await page.evaluate(() => {
  const g = window.ME.draw.graph;
  let m = Infinity;
  for (let i = 0; i < g.atoms.length; i++) {
    for (let j = i + 1; j < g.atoms.length; j++) {
      m = Math.min(m, Math.hypot(g.atoms[i].x - g.atoms[j].x, g.atoms[i].y - g.atoms[j].y));
    }
  }
  return +m.toFixed(2);
});
check('separate atoms are far enough apart to read', sep >= 0.79, `closest pair ${sep} bond lengths`);
await clearDraw();
await page.waitForTimeout(150);

/* validation: five bonds on one carbon */
await page.evaluate(() => {
  const ME = window.ME, M = ME.drawModel;
  const g = M.emptyGraph();
  const c = M.addAtom(g, 0, 0, 'C');
  for (let k = 0; k < 5; k++) {
    const a = M.addAtom(g, Math.cos(k * 1.2) * 1, Math.sin(k * 1.2) * 1, 'C');
    M.addBond(g, c, a, 1);
  }
  ME.draw.setGraph(g);
});
await page.waitForTimeout(450);
const vtext = await page.locator('.draw-side').innerText();
check('five-bond carbon is flagged', /Carbon with 5 bonds/i.test(vtext), vtext.slice(0, 160));
check('five-bond message explains why', /four electrons to share|four hands/i.test(vtext));
await page.screenshot({ path: path.join(SHOTS, '10-draw-validation.png') });

/* valid ions must NOT be flagged */
const ionResults = await page.evaluate(() => {
  const out = {};
  const cases = {
    ammonium: '[NH4+]', sulfate: '[O-]S(=O)(=O)[O-]', nitrate: '[N+](=O)([O-])[O-]',
    permanganate: '[O-][Mn](=O)(=O)=O', dmso: 'CS(C)=O', phosphate: 'OP(=O)(O)O',
    carbonate: '[O-]C(=O)[O-]', hydroxide: '[OH-]', sf6: 'FS(F)(F)(F)(F)F',
  };
  for (const k in cases) {
    try {
      const mol = window.ME.chem.fromSmiles(cases[k]);
      out[k] = window.ME.chem.validateMolecule(mol).length;
    } catch (e) { out[k] = 'parse error: ' + e.message; }
  }
  return out;
});
Object.entries(ionResults).forEach(([k, v]) => check(`${k} not flagged`, v === 0, 'problems: ' + v));

/* periodic table */
await page.locator('.draw-toolbar .tool', { hasText: '…' }).click();
await page.waitForTimeout(300);
const ptCells = await page.locator('.pt-cell').count();
check('periodic table has every element', ptCells === 118, 'got ' + ptCells);
check('the picker is colour-coded by category', await page.evaluate(() => {
  const cells = Array.from(document.querySelectorAll('.pt-cell'));
  return cells.every((c) => c.dataset.block)
    && new Set(cells.map((c) => getComputedStyle(c).backgroundColor)).size >= 8;
}));
{
  /* picking an element with no button of its own must still show somewhere */
  await page.locator('.pt-cell[title^="Sodium"]').click();
  await page.waitForTimeout(300);
  const shown = await page.evaluate(() => {
    const on = document.querySelector('.draw-toolbar .tool.on');
    return on ? on.textContent.trim() : 'none';
  });
  check('picking an exotic element shows it on the toolbar', shown === 'Na', shown);
  await page.locator('.draw-toolbar .tool.el', { hasText: /^C$/ }).click();
  await page.waitForTimeout(150);
}
await page.screenshot({ path: path.join(SHOTS, '11-ptable.png') });
await page.keyboard.press('Escape');

/* ------------------------------------------------------------ dark mode */
await page.locator('.nav .icon-btn').click();   /* system -> light */
await page.locator('.nav .icon-btn').click();   /* light -> dark */
await page.waitForTimeout(400);
check('dark mode applied', await page.getAttribute('html', 'data-theme') === 'dark');
await page.locator('.tab[data-view=gallery]').click();
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(SHOTS, '12-dark-gallery.png') });

/* ------------------------------------------------- resetting and forgetting */
/* These reload the page, so they come last in the offline run. */
{
  const progressText = () => page.locator('.progress-row .note').first().innerText();
  const storedKeys = () => page.evaluate(() => {
    try {
      return {
        lessons: localStorage.getItem('molx.lessons'),
        theme: localStorage.getItem('molx.theme'),
      };
    } catch (e) { return { lessons: null, theme: null }; }
  });
  /* Answer two questions in the first organic lesson, which is the one whose
     answers are known. Opened by id so the map layout cannot break it. */
  const answerTwo = async () => {
    await page.locator('.tab[data-view=learn]').click();
    await page.waitForTimeout(250);
    await page.evaluate(() => window.ME.learn.showLesson('why'));
    await page.waitForTimeout(350);
    await page.locator('.quiz-item').nth(0).locator('.quiz-opt').nth(1).click();
    await page.waitForTimeout(150);
    await page.locator('.quiz-item').nth(1).locator('.quiz-opt').nth(0).click();
    await page.waitForTimeout(250);
    await page.locator('.ls-crumb').click();
    await page.waitForTimeout(300);
  };

  await page.evaluate(() => {
    try {
      localStorage.removeItem('molx.remember');
      /* Earlier checks answered a checkpoint, so start this block clean or
         the counts below are off by one. */
      localStorage.removeItem('molx.lessons');
      localStorage.removeItem('molx.lastLesson');
    } catch (e) { /* fine */ }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);

  await answerTwo();
  check('answers are counted', (await progressText()).startsWith('2 of ' + QTOTAL), await progressText());
  check('answers are written to storage', !!(await storedKeys()).lessons);

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  check('answers survive a reload by default', (await progressText()).startsWith('2 of ' + QTOTAL), await progressText());

  /* the reset button asks before it does anything */
  const resetBtn = page.locator('.progress-controls .btn');
  await resetBtn.click();
  await page.waitForTimeout(150);
  check('reset asks first', /sure/i.test(await resetBtn.innerText()), await resetBtn.innerText());
  await resetBtn.click();
  await page.waitForTimeout(400);
  check('reset clears the count', (await progressText()).startsWith('0 of ' + QTOTAL), await progressText());
  check('reset clears storage', !(await storedKeys()).lessons);
  check('reset does not touch the theme', !!(await storedKeys()).theme);
  {
    /* reopening the lesson has to show the questions unanswered again */
    await page.evaluate(() => window.ME.learn.showLesson('why'));
    await page.waitForTimeout(350);
    check('reset reopens the questions', await page.locator('.quiz-item.solved').count() === 0);
    check('reset leaves the options clickable',
      await page.locator('.quiz-item').nth(0).locator('.quiz-opt:not([disabled])').count() === 3);
    await page.locator('.ls-crumb').click();
    await page.waitForTimeout(250);
  }

  /* the first tap disarms itself if nothing follows */
  await resetBtn.click();
  await page.waitForTimeout(4400);
  check('an unconfirmed reset disarms itself', !/sure/i.test(await resetBtn.innerText()), await resetBtn.innerText());

  /* switching remembering off */
  await answerTwo();
  await page.locator('.switch input').uncheck();
  await page.waitForTimeout(300);
  check('switching off wipes what was stored', !(await storedKeys()).lessons);
  check('switching off keeps this session\u2019s answers', (await progressText()).startsWith('2 of ' + QTOTAL), await progressText());

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  check('nothing is remembered after a reload', (await progressText()).startsWith('0 of ' + QTOTAL), await progressText());
  check('the switch itself is remembered', !(await page.locator('.switch input').isChecked()));

  await answerTwo();
  check('answering still works while not saving', (await progressText()).startsWith('2 of ' + QTOTAL), await progressText());
  check('and still writes nothing', !(await storedKeys()).lessons);

  /* and back on again */
  await page.locator('.switch input').check();
  await page.waitForTimeout(200);
  await answerTwo();
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  check('switching it back on resumes saving', (await progressText()).startsWith('2 of ' + QTOTAL), await progressText());
}

/* -------------------------------------------------------------- summary */
check('still no script errors at the end', errors.length === 0, errors.slice(0, 4).join(' | '));
/* The search box finds the course and the calculators, not only molecules.
   Before this, typing "limiting reactant" returned nothing at all, because
   the whole course was reachable only by knowing which tab it was in. */
await page.fill('.searchbox input', 'limiting reactant');
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
const siteText = await page.locator('#view-search').innerText();
check('search results include an "In this app" section',
  /in this app/i.test(siteText), siteText.slice(0, 200));
check('and it names the limiting-reactant material',
  /limiting reactant/i.test(siteText));
await page.screenshot({ path: path.join(SHOTS, '06b-search-app.png'), fullPage: true });

/* And clicking one actually goes there. */
const siteRows = page.locator('#view-search .res-site');
check('app results are shown as their own kind of row', await siteRows.count() > 0);
await siteRows.first().click();
await page.waitForTimeout(700);
check('clicking an app result navigates away from the search view',
  !/^#\/search/.test(await page.evaluate(() => location.hash)),
  await page.evaluate(() => location.hash));

/* A concept with no molecule of that name still finds its lesson. */
await page.fill('.searchbox input', 'le chatelier');
await page.waitForTimeout(500);
const suggestText = await page.locator('.suggest').innerText();
check('the dropdown offers app results for a concept query',
  /in this app/i.test(suggestText), suggestText.slice(0, 200));

/* A glossary word links to that one entry, highlighted. */
await page.evaluate(() => { location.hash = '#/reference/glossary/' + encodeURIComponent('entropy'); });
await page.waitForTimeout(600);
check('a glossary link highlights the word it named',
  await page.locator('#view-reference .rf-gloss-item.on').count() === 1,
  String(await page.locator('#view-reference .rf-gloss-item.on').count()));

check('never touched the network in the whole offline run', attempted.length === 0, attempted.slice(0, 5).join(', '));

/* ============================ online phase ============================ */
/* The one optional feature. Skipped (not failed) when this machine has no
 * connection, since the point of the app is that it does not need one. */
console.log('\nOnline phase (PubChem):');
await ctx.setOffline(false);
await ctx.unroute('**/*');
const online = await page.evaluate(async () => {
  try {
    const r = await fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2519/property/Title/JSON');
    return r.ok;
  } catch (e) { return false; }
});

if (!online) {
  console.log('  ~ no internet from this machine, skipping the online checks');
} else {
  await page.fill('.searchbox input', 'ibuprofen lysine');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3500);
  const t = await page.locator('#view-search').innerText();
  check('PubChem autocomplete returns suggestions',
    /from pubchem/i.test(t) && !/could not reach/i.test(t), t.slice(0, 220));

  const onlineRow = page.locator('#view-search .res', { hasText: 'from PubChem' }).first();
  if (await onlineRow.count()) {
    await onlineRow.click();
    await page.waitForTimeout(4000);
    const molText = await page.locator('#view-molecule').innerText();
    check('a PubChem molecule opens its full page',
      /Molecular formula/i.test(molText) && /From PubChem/i.test(molText), molText.slice(0, 200));
    check('PubChem molecule got a 3D view or an explanation',
      (await page.locator('.viewer3d canvas').count()) > 0 ||
      /No 3D shape available/i.test(molText));
    await page.screenshot({ path: path.join(SHOTS, '13-pubchem.png'), fullPage: true });
  } else {
    check('a PubChem result row appeared', false, 'no rows rendered');
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFailures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
