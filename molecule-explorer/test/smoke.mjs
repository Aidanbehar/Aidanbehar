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
check('navigation rendered', await page.locator('.nav .tab').count() === 5);
check('Elements sits between Draw and Gallery',
  (await page.locator('.nav .tab').allInnerTexts()).join('|') === 'Learn|Draw|Elements|Gallery|Search',
  (await page.locator('.nav .tab').allInnerTexts()).join('|'));
check('Learn is the default view', await page.locator('#view-learn.active').count() === 1);
check('lesson 1 rendered', (await page.locator('.lesson h2').innerText()).includes('Why draw'));
check('lesson figures drew molecules', await page.locator('#view-learn svg.molcanvas').count() >= 2);

await page.screenshot({ path: path.join(SHOTS, '01-learn.png'), fullPage: false });

/* ------------------------------------------------------------- lessons */
const lessonCount = await page.locator('.lesson-link').count();
check('eleven lessons listed', lessonCount === 11, 'got ' + lessonCount);

/* answer lesson 1's quiz correctly */
await page.locator('.quiz-opt').nth(1).click();
await page.waitForTimeout(250);
check('quiz accepts the right answer', await page.locator('.quiz-feedback.show .callout.ok').count() === 1);
check('progress recorded', (await page.locator('.progress-wrap .note').innerText()).startsWith('1 of 33'),
  await page.locator('.progress-wrap .note').innerText());

/* Each lesson carries a set of questions, and a wrong answer explains itself
   rather than just locking the question. */
check('lesson 1 shows a set of questions', await page.locator('.quiz-item').count() === 3,
  'got ' + (await page.locator('.quiz-item').count()));
check('the set keeps a running tally', /1 \/ 3/.test(await page.locator('.quiz-tally').innerText()),
  await page.locator('.quiz-tally').innerText());
{
  /* a wrong option should say why that option is wrong, and leave the rest open */
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
  await page.locator('.lesson-link').nth(4).click();
  await page.waitForTimeout(300);
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
  await page.locator('.lesson-link').nth(5).click();
  await page.waitForTimeout(400);
  const aq = page.locator('.quiz-item').nth(0);
  await aq.locator('.clickmol .hit').nth(0).click();
  await page.waitForTimeout(200);
  const msg = await aq.locator('.quiz-feedback').innerText();
  check('a wrong click describes what was clicked', /That carbon has (one|two|three|four) line/i.test(msg), msg.slice(0, 90));
}
await page.locator('.lesson-link').nth(0).click();
await page.waitForTimeout(200);

/* walk every lesson to be sure none of them throws */
for (let i = 0; i < lessonCount; i++) {
  await page.locator('.lesson-link').nth(i).click();
  await page.waitForTimeout(160);
}
check('all eleven lessons render without error', errors.length === 0, errors.slice(0, 2).join(' | '));
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

/* --------------------------------------------------------------- gallery */
await page.locator('.tab[data-view=gallery]').click();
await page.waitForTimeout(900);
const cards = await page.locator('.gal-card').count();
check('gallery shows ~60 molecules', cards >= 55, 'got ' + cards);
check('gallery thumbnails drew', await page.locator('.gal-card .thumb svg').count() > 5);
await page.screenshot({ path: path.join(SHOTS, '08-gallery.png') });
await page.locator('.gal-filters .btn', { hasText: 'Medicines' }).click();
await page.waitForTimeout(400);
check('gallery filter narrows the grid', await page.locator('.gal-card').count() < cards);

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
  const progressText = () => page.locator('.progress-wrap .note').innerText();
  const storedKeys = () => page.evaluate(() => {
    try {
      return {
        lessons: localStorage.getItem('molx.lessons'),
        theme: localStorage.getItem('molx.theme'),
      };
    } catch (e) { return { lessons: null, theme: null }; }
  });
  const answerTwo = async () => {
    await page.locator('.tab[data-view=learn]').click();
    await page.waitForTimeout(250);
    await page.locator('.lesson-link').nth(0).click();
    await page.waitForTimeout(300);
    await page.locator('.quiz-item').nth(0).locator('.quiz-opt').nth(1).click();
    await page.waitForTimeout(150);
    await page.locator('.quiz-item').nth(1).locator('.quiz-opt').nth(0).click();
    await page.waitForTimeout(250);
  };

  await page.evaluate(() => { try { localStorage.removeItem('molx.remember'); } catch (e) { /* fine */ } });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);

  await answerTwo();
  check('answers are counted', /^2 of 33/.test(await progressText()), await progressText());
  check('answers are written to storage', !!(await storedKeys()).lessons);

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  check('answers survive a reload by default', /^2 of 33/.test(await progressText()), await progressText());

  /* the reset button asks before it does anything */
  const resetBtn = page.locator('.progress-controls .btn');
  await resetBtn.click();
  await page.waitForTimeout(150);
  check('reset asks first', /sure/i.test(await resetBtn.innerText()), await resetBtn.innerText());
  await resetBtn.click();
  await page.waitForTimeout(400);
  check('reset clears the count', /^0 of 33/.test(await progressText()), await progressText());
  check('reset clears storage', !(await storedKeys()).lessons);
  check('reset reopens the questions', await page.locator('.quiz-item.solved').count() === 0);
  check('reset leaves the options clickable',
    await page.locator('.quiz-item').nth(0).locator('.quiz-opt:not([disabled])').count() === 3);
  check('reset does not touch the theme', !!(await storedKeys()).theme);

  /* the first tap disarms itself if nothing follows */
  await resetBtn.click();
  await page.waitForTimeout(4400);
  check('an unconfirmed reset disarms itself', !/sure/i.test(await resetBtn.innerText()), await resetBtn.innerText());

  /* switching remembering off */
  await answerTwo();
  await page.locator('.switch input').uncheck();
  await page.waitForTimeout(300);
  check('switching off wipes what was stored', !(await storedKeys()).lessons);
  check('switching off keeps this session\u2019s answers', /^2 of 33/.test(await progressText()), await progressText());

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  check('nothing is remembered after a reload', /^0 of 33/.test(await progressText()), await progressText());
  check('the switch itself is remembered', !(await page.locator('.switch input').isChecked()));

  await answerTwo();
  check('answering still works while not saving', /^2 of 33/.test(await progressText()), await progressText());
  check('and still writes nothing', !(await storedKeys()).lessons);

  /* and back on again */
  await page.locator('.switch input').check();
  await page.waitForTimeout(200);
  await answerTwo();
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  check('switching it back on resumes saving', /^2 of 33/.test(await progressText()), await progressText());
}

/* -------------------------------------------------------------- summary */
check('still no script errors at the end', errors.length === 0, errors.slice(0, 4).join(' | '));
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
