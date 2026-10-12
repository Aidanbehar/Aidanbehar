// End-to-end tests of the real application in Chromium (Playwright), served by
// the same serve.py the macOS launcher uses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OPERA = `[Event "Paris Opera"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8.
Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14.
Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0

[Event "Second game"]
[White "A"]
[Black "B"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1
`;

function freePort() {
  return new Promise((resolve) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); }); });
}
async function startServer(args = []) {
  const port = await freePort();
  const proc = spawn('python3', [path.join(ROOT, 'serve.py'), '--port', String(port), '--no-browser', ...args], { stdio: 'pipe' });
  await new Promise((resolve, reject) => {
    proc.stdout.on('data', (d) => { if (String(d).includes('running at')) resolve(); });
    proc.on('exit', (c) => reject(new Error(`server exited ${c}`)));
    setTimeout(() => reject(new Error('server start timeout')), 10000);
  });
  return { port, url: `http://localhost:${port}/index.html`, stop: () => proc.kill() };
}
async function startPlainServer() {
  // A server WITHOUT the cross-origin isolation headers.
  const port = await freePort();
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'pipe' });
  for (let i = 0; i < 50; i++) {
    const ok = await new Promise((r) => { const s = net.connect(port, '127.0.0.1', () => { s.end(); r(true); }); s.on('error', () => r(false)); });
    if (ok) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  return { url: `http://localhost:${port}/index.html`, stop: () => proc.kill() };
}

let browser;
let server;
const ctxOpts = { viewport: { width: 1440, height: 900 } };

async function openApp(t, { url = server.url, routes, clearStorage = true, allowErrors = [] } = {}) {
  const context = await browser.newContext(ctxOpts);
  const errors = [];
  const external = [];
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') { external.push(u.href); return route.abort(); }
    if (routes) for (const [re, fn] of routes) if (re.test(u.pathname)) return fn(route);
    return route.continue();
  });
  await context.addInitScript(() => {
    // Track worker life cycles for the cleanup test.
    const W = window.Worker;
    window.__workers = { created: 0, terminated: 0 };
    window.Worker = class extends W {
      constructor(...a) { super(...a); window.__workers.created++; }
      terminate() { window.__workers.terminated++; return super.terminate(); }
    };
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !allowErrors.some((re) => re.test(m.text()))) errors.push(`console: ${m.text()}`); });
  if (clearStorage) await page.addInitScript(() => { try { if (!sessionStorage.getItem('kept')) { localStorage.clear(); sessionStorage.setItem('kept', '1'); } } catch { /* ignore */ } });
  await page.goto(url);
  t.after(async () => { await context.close(); });
  return { page, errors, external, context };
}

const engineReady = (page, ms = 90000) => page.waitForFunction(() => window.__app?.engine?.state === 'ready', null, { timeout: ms });
async function sqCenter(page, sq) {
  const box = await page.locator(`#board .sq[data-sq="${sq}"]`).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function clickMove(page, from, to) {
  const a = await sqCenter(page, from);
  await page.mouse.click(a.x, a.y);
  const b = await sqCenter(page, to);
  await page.mouse.click(b.x, b.y);
}
async function dragMove(page, from, to) {
  const a = await sqCenter(page, from);
  const b = await sqCenter(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
}
const app = (page, fn, arg) => page.evaluate(fn, arg);

test.before(async () => {
  server = await startServer();
  browser = await playwright.chromium.launch();
});
test.after(async () => { await browser?.close(); server?.stop(); });

test('app loads offline-capable, cross-origin isolated, engine identifies as Stockfish 19', { timeout: 180000 }, async (t) => {
  const { page, errors, external } = await openApp(t);
  await engineReady(page);
  const info = await app(page, () => ({ iso: crossOriginIsolated, name: __app.engine.id.name, arch: __app.engine.buildArch, net: __app.engine.net, legal: document.querySelector('#legal-count').textContent }));
  assert.equal(info.iso, true);
  assert.equal(info.name, 'Stockfish 19');
  assert.equal(info.net, 'nn-1a298aa575a0.nnue');
  assert.equal(info.legal, '20');
  await page.waitForFunction(() => Number(document.querySelector('[data-testid=depth]')?.textContent) >= 10, null, { timeout: 60000 });
  const shown = await app(page, () => ({ eval: document.querySelector('[data-testid=eval]').textContent, best: document.querySelector('[data-testid=bestmove]').textContent, lines: document.querySelectorAll('[data-testid=pv-line]').length, resFen: __app.analysis.result?.fen, fen: __app.currentFen() }));
  assert.match(shown.eval, /^[+−]?\d+\.\d\d$|^-?M\d+$/);
  assert.ok(['e4', 'd4', 'Nf3', 'c4', 'e3', 'g3'].includes(shown.best), `plausible best move ${shown.best}`);
  assert.equal(shown.lines, 3);
  assert.equal(shown.resFen, shown.fen, 'displayed analysis belongs to the displayed position');
  assert.deepEqual(external, [], 'no requests leave localhost');
  assert.deepEqual(errors, []);
});

test('board: click and drag moves, SAN move list, legal count, FEN sync, undo/redo, flip, promotion, check', { timeout: 120000 }, async (t) => {
  const { page, errors } = await openApp(t);
  await app(page, () => { document.querySelector('#engine-toggle').click(); });
  await clickMove(page, 'e2', 'e4');
  await dragMove(page, 'g8', 'f6');
  await clickMove(page, 'g1', 'f3');
  const st = await app(page, () => ({ moves: [...document.querySelectorAll('#movelist .mv')].map((b) => b.textContent), fen: document.querySelector('#fen-input').value, legal: document.querySelector('#legal-count').textContent, cur: __app.currentFen() }));
  assert.deepEqual(st.moves, ['e4', 'Nf6', 'Nf3']);
  assert.equal(st.fen, 'rnbqkb1r/pppppppp/5n2/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 2');
  assert.equal(st.fen, st.cur);
  assert.equal(Number(st.legal), await app(page, () => __app.chess.moves().length));
  // Selecting a piece shows legal destinations.
  const a = await sqCenter(page, 'b8');
  await page.mouse.click(a.x, a.y);
  assert.equal(await page.locator('#board .sq.dest').count(), 2);
  await page.mouse.click(a.x, a.y);
  // Undo / redo.
  await page.click('[data-act=undo]');
  assert.equal(await page.locator('#movelist .mv').count(), 2);
  await page.click('[data-act=redo]');
  assert.equal(await page.locator('#movelist .mv').count(), 3);
  // Keyboard navigation.
  await page.locator('body').click({ position: { x: 5, y: 880 } });
  await page.keyboard.press('ArrowLeft');
  assert.equal(await app(page, () => __app.node.san), 'Nf6');
  await page.keyboard.press('Home');
  assert.equal(await app(page, () => __app.node.ply), 0);
  await page.keyboard.press('End');
  assert.equal(await app(page, () => __app.node.san), 'Nf3');
  // Flip.
  await page.click('[data-act=flip]');
  assert.equal(await app(page, () => __app.board.orientation), 'b');
  await page.click('[data-act=flip]');
  // Typed move entry.
  await page.fill('#move-input', 'Nxe4');
  await page.press('#move-input', 'Enter');
  assert.equal(await app(page, () => __app.node.san), 'Nxe4');
  // Promotion picker and check highlight.
  await page.fill('#fen-input', '7k/1P6/8/8/8/8/8/K7 w - - 0 1');
  await page.click('#fen-load');
  await clickMove(page, 'b7', 'b8');
  await page.waitForSelector('.promo:not(.hidden) .promo-btn');
  assert.equal(await page.locator('.promo-btn').count(), 4);
  await page.click('.promo-btn[aria-label="Promote to queen"]');
  assert.equal(await app(page, () => __app.node.san), 'b8=Q+');
  assert.equal(await page.locator('#board .sq.check').count(), 1);
  assert.equal(await page.locator('#board .sq.check').getAttribute('data-sq'), 'h8');
  assert.match(await page.textContent('#pos-status'), /Black is in check/);
  assert.deepEqual(errors, []);
});

test('analysis controls: MultiPV, depth limit, stop, explore line, no stale results while navigating', { timeout: 240000 }, async (t) => {
  const { page, errors } = await openApp(t);
  await engineReady(page);
  await page.fill('#pgn-input', OPERA);
  await page.click('#pgn-load');
  // Rapid navigation with continuous analysis: the shown result must always match.
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press(i % 3 === 2 ? 'ArrowLeft' : 'ArrowRight');
    const ok = await app(page, () => !__app.analysis.result || __app.analysis.result.fen === __app.currentFen());
    assert.ok(ok, `stale analysis shown at step ${i}`);
  }
  await page.waitForFunction(() => __app.analysis.result && __app.analysis.result.fen === __app.currentFen() && __app.analysis.result.depth >= 8, null, { timeout: 60000 });
  const legal = await app(page, () => { const r = __app.analysis.result; return r.lines.every((l) => __app.chess.moves({ verbose: true }).some((m) => m.lan === l.pv[0])); });
  assert.ok(legal, 'every candidate starts with a legal move in the shown position');
  // MultiPV 2 + depth limit 10.
  await page.selectOption('#multipv-input', '2');
  await page.selectOption('#limit-mode', 'depth');
  await page.fill('#depth-input', '10');
  await page.dispatchEvent('#depth-input', 'change');
  await page.waitForFunction(() => __app.analysis.result?.depth >= 10 && !__app.analysis.handle && document.querySelectorAll('[data-testid=pv-line]').length === 2, null, { timeout: 60000 });
  // Infinite + Stop.
  await page.selectOption('#limit-mode', 'infinite');
  await page.click('#analyze-btn');
  await page.waitForFunction(() => !!__app.analysis.handle, null, { timeout: 10000 });
  await page.click('#stop-btn');
  await page.waitForFunction(() => !__app.analysis.handle && !__app.engine.busy, null, { timeout: 10000 });
  // Responsiveness during a search: event-loop lag stays small.
  await page.click('#analyze-btn');
  const lag = await app(page, () => new Promise((resolve) => {
    let max = 0; let last = performance.now();
    const id = setInterval(() => { const now = performance.now(); max = Math.max(max, now - last - 20); last = now; }, 20);
    setTimeout(() => { clearInterval(id); resolve(max); }, 2000);
  }));
  assert.ok(lag < 250, `UI stayed responsive during search (max lag ${lag.toFixed(0)} ms)`);
  // Explore a candidate line.
  await page.waitForSelector('[data-explore="0"]');
  const base = await app(page, () => __app.currentFen());
  await page.click('[data-explore="0"]');
  await page.waitForSelector('#preview-bar:not(.hidden)');
  assert.notEqual(await app(page, () => __app.currentFen()), base);
  await page.keyboard.press('ArrowRight');
  assert.equal(await app(page, () => __app.preview.index), 2);
  await page.keyboard.press('Escape');
  assert.equal(await app(page, () => __app.currentFen()), base);
  // Play the recommended move.
  await page.waitForSelector('[data-play="0"]');
  const before = await app(page, () => __app.node.ply);
  await page.click('[data-play="0"]');
  assert.equal(await app(page, () => __app.node.ply), before + 1);
  // Engine off/on.
  await page.click('#engine-toggle + .slider');
  await page.waitForFunction(() => __app.engine.state === 'off');
  assert.equal(await app(page, () => __app.engine.worker), null, 'worker released when the engine is switched off');
  assert.equal(await page.locator('[data-testid=eval]').count(), 0, 'no evaluation shown while the engine is off');
  await page.click('#engine-toggle + .slider');
  await engineReady(page);
  assert.deepEqual(errors, []);
});

test('FEN and PGN: validation messages, multi-game import, navigation, export', { timeout: 120000 }, async (t) => {
  const { page, errors } = await openApp(t);
  await page.fill('#fen-input', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
  await page.click('#fen-load');
  assert.match(await page.textContent('#fen-error'), /6 space-separated fields/);
  await page.fill('#fen-input', 'k7/8/1K6/8/8/8/8/7Q w - - 0 1');
  await page.click('#fen-load');
  assert.match(await page.textContent('#fen-error'), /not to move .* in check/);
  await page.fill('#pgn-input', '1. e4 e5 2. Ke3 *');
  await page.click('#pgn-load');
  assert.match(await page.textContent('#pgn-error'), /"Ke3" is not a legal move for White at move 2/);
  await page.fill('#pgn-input', OPERA);
  await page.click('#pgn-load');
  assert.equal(await page.locator('#game-picker [data-game]').count(), 2);
  assert.match(await page.textContent('#game-header'), /Paul Morphy/);
  await page.keyboard.press('End');
  assert.equal(await app(page, () => __app.node.san), 'Rd8#');
  assert.match(await page.textContent('#pos-status'), /Checkmate — White wins/);
  assert.equal(await page.textContent('#legal-count'), '0');
  assert.match(await page.textContent('#game-progress-text'), /Ply 33 \/ 33/);
  await page.click('#movelist .mv >> text=Bxf3');
  assert.equal(await app(page, () => __app.node.san), 'Bxf3');
  assert.equal(await app(page, () => __app.board.pieces.get('f3')?.type), 'b', 'board shows the clicked position');
  await page.click('#game-picker [data-game="1"]');
  assert.equal(await app(page, () => __app.tree.mainline().length), 4);
  const pgn = await app(page, async () => (await import('./js/pgn.js')).treeToPgn(__app.tree));
  assert.match(pgn, /1\. f3 e5 2\. g4 Qh4# 0-1/);
  assert.deepEqual(errors, []);
});

test('sequence counter in the browser: 8,902 for 3 plies, cross-check with Stockfish, cancel, stale protection', { timeout: 240000 }, async (t) => {
  const { page, errors } = await openApp(t);
  await engineReady(page);
  await page.click('#counter-card summary');
  await page.selectOption('#counter-depth', '2');
  await page.click('#counter-run');
  await page.waitForSelector('[data-testid=counter-total]');
  assert.equal(await page.textContent('[data-testid=counter-total]'), '400');
  await page.selectOption('#counter-depth', '3');
  await page.click('#counter-run');
  await page.waitForFunction(() => document.querySelector('[data-testid=counter-total]')?.textContent === '8,902', null, { timeout: 60000 });
  await page.click('#counter-verify');
  await page.waitForSelector('[data-testid=counter-verify]', { timeout: 60000 });
  assert.match(await page.textContent('[data-testid=counter-verify]'), /8,902 — matches/);
  // Cancel a long count.
  await page.fill('#fen-input', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  await page.click('#fen-load');
  await page.selectOption('#counter-depth', '6');
  const before = await app(page, () => window.__workers.terminated);
  await page.click('#counter-run');
  await page.waitForTimeout(500);
  await page.click('#counter-cancel');
  assert.match(await page.textContent('#counter-result'), /Cancelled/);
  assert.ok(await app(page, () => window.__workers.terminated) > before, 'counting worker terminated');
  // Position change during a count cancels it (no stale result).
  await page.click('#counter-run');
  await page.waitForTimeout(300);
  await clickMove(page, 'a2', 'a3');
  assert.match(await page.textContent('#counter-result'), /Position changed — count cancelled/);
  assert.deepEqual(errors, []);
});

test('game review with Stockfish 19: classifications, summary, critical moments', { timeout: 600000 }, async (t) => {
  const { page, errors } = await openApp(t);
  await engineReady(page);
  await page.fill('#pgn-input', OPERA);
  await page.click('#pgn-load');
  await page.click('#tab-review');
  await page.fill('#review-depth', '10');
  await page.dispatchEvent('#review-depth', 'change');
  await page.selectOption('#review-multipv', '1');
  await page.click('#review-start');
  await page.waitForFunction(() => /Review complete/.test(document.querySelector('#review-status').textContent), null, { timeout: 480000 });
  const r = await app(page, () => {
    const nodes = __app.tree.mainline();
    return {
      reviewed: nodes.filter((n) => n.review).length,
      total: nodes.length,
      allMatch: nodes.every((n) => n.reviewEval && n.reviewEval.fen === n.fen),
      last: nodes[nodes.length - 1].review,
      classes: nodes.map((n) => n.review.cls),
      badges: document.querySelectorAll('#review-movelist .badge').length,
    };
  });
  assert.equal(r.reviewed, r.total, 'every move classified');
  assert.ok(r.allMatch, 'each stored evaluation belongs to its own position');
  assert.ok(['best', 'forced'].includes(r.last.cls), 'Rd8# is the best move');
  assert.ok(r.classes.includes('book'), 'opening moves recognised as book');
  assert.ok(r.classes.some((c) => ['mistake', 'blunder', 'inaccuracy'].includes(c)), 'the losing side made errors');
  assert.match(await page.textContent('#review-summary'), /Blunder/);
  // Jump to a critical moment.
  const crit = page.locator('#review-critical button').first();
  await crit.click();
  const sel = await app(page, () => ({ san: __app.node.san, cls: __app.node.review.cls }));
  assert.ok(['inaccuracy', 'mistake', 'blunder'].includes(sel.cls));
  const card = await page.textContent('#review-move');
  assert.match(card, /Engine preferred/);
  assert.match(card, /Eval before/);
  assert.match(card, /Eval after/);
  assert.match(card, /Best line/);
  assert.deepEqual(errors, []);
});

test('openings tab identifies the line from the move sequence', { timeout: 120000 }, async (t) => {
  const { page, errors } = await openApp(t);
  await page.click('#engine-toggle + .slider');
  for (const [a, b] of [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'b5']]) await clickMove(page, a, b);
  await page.click('#tab-openings');
  await page.waitForSelector('[data-testid=opening-name]');
  assert.equal(await page.textContent('[data-testid=opening-name]'), 'Ruy Lopez');
  assert.match(await page.textContent('#opening-detail'), /C60/);
  assert.match(await page.textContent('#opening-detail'), /Exact sequence match/);
  await page.click('#opening-continuations button >> nth=0');
  assert.equal(await app(page, () => __app.node.ply), 6);
  await page.fill('#opening-search', 'Najdorf');
  assert.ok(await page.locator('#opening-results li').count() > 3);
  assert.deepEqual(errors, []);
});

test('position editor: validation and applying a position', { timeout: 120000 }, async (t) => {
  const { page, errors } = await openApp(t);
  await page.click('[data-act=edit]');
  await page.waitForSelector('#editor-panel:not(.hidden)');
  await page.click('#ed-clear');
  assert.match(await page.textContent('#ed-error'), /king/i);
  assert.equal(await page.isDisabled('#ed-apply'), true);
  const place = async (tool, sq) => { await page.click(`[data-tool="${tool}"]`); const c = await sqCenter(page, sq); await page.mouse.click(c.x, c.y); };
  await place('wK', 'e1');
  await place('bK', 'e8');
  await place('wR', 'h1');
  await page.check('#ed-K');
  assert.equal(await page.textContent('#ed-error'), '');
  await page.uncheck('#ed-K');
  await page.check('#ed-k');
  assert.match(await page.textContent('#ed-error'), /Castling right "k"/);
  await page.uncheck('#ed-k');
  await page.check('input[name=ed-turn][value=b]');
  assert.equal(await page.isDisabled('#ed-apply'), false);
  await page.click('#ed-apply');
  assert.equal(await app(page, () => __app.currentFen()), '4k3/8/8/8/8/8/8/4K2R b - - 0 1');
  assert.equal(await page.textContent('#legal-count'), String(await app(page, () => __app.chess.moves().length)));
  assert.deepEqual(errors, []);
});

test('learning center: lesson, rule-verified exercise, quiz, progress, puzzle mode', { timeout: 120000 }, async (t) => {
  const { page, errors } = await openApp(t);
  await page.click('#engine-toggle + .slider');
  await page.click('#tab-learn');
  await page.click('[data-lesson="check-mate-stalemate"]');
  await page.waitForSelector('#lb-ex.board');
  // Wrong move first: Qf7 is stalemate.
  const ex = async (sq) => { const loc = page.locator(`#lb-ex .sq[data-sq="${sq}"]`); await loc.scrollIntoViewIfNeeded(); const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  let a = await ex('f1'); await page.mouse.click(a.x, a.y);
  let b = await ex('f7'); await page.mouse.click(b.x, b.y);
  await page.waitForFunction(() => /stalemate/i.test(document.querySelector('#lb-ex-panel .feedback').textContent));
  await page.waitForTimeout(1300);
  a = await ex('f1'); await page.mouse.click(a.x, a.y);
  b = await ex('f8'); await page.mouse.click(b.x, b.y);
  await page.waitForFunction(() => /checkmate/i.test(document.querySelector('#lb-ex-panel .feedback.ok')?.textContent || ''));
  await page.click('#lb-quiz [data-i="2"]');
  await page.waitForSelector('#lb-quiz .feedback.ok');
  assert.equal(await app(page, () => JSON.parse(localStorage.getItem('ca.learn')).done['check-mate-stalemate']), true);
  assert.match(await page.textContent('#learn-progress'), /1 of 51/);
  // A count exercise is checked against the rules library.
  await page.click('[data-lesson="legal-moves"]');
  await page.fill('.ex-count-input', '5');
  await page.click('.ex-check');
  assert.match(await page.textContent('#lb-ex-panel .feedback'), /fewer/);
  await page.fill('.ex-count-input', '4');
  await page.click('.ex-check');
  assert.match(await page.textContent('#lb-ex-panel .feedback'), /exactly 4/);
  // Puzzle mode.
  await page.click('#puzzle-mode-btn');
  await page.waitForSelector('#pz-board.board');
  assert.match(await page.textContent('#learn-main'), /Puzzle mode/);
  assert.deepEqual(errors, []);
});

test('missing NNUE file: clear error, no fake analysis, recovery offered', { timeout: 120000 }, async (t) => {
  const { page } = await openApp(t, { routes: [[/nnue\.part1$/, (r) => r.fulfill({ status: 404, body: 'missing' })]] });
  await page.waitForFunction(() => __app.engine.state === 'error', null, { timeout: 60000 });
  const s = await app(page, () => ({ code: __app.engine.error.code, msg: __app.engine.error.message, banner: document.querySelector('#banner').textContent, evals: document.querySelectorAll('[data-testid=eval]').length, status: document.querySelector('#engine-status').textContent }));
  assert.equal(s.code, 'nnue-missing');
  assert.match(s.msg, /HTTP 404/);
  assert.match(s.banner, /Stockfish 19 stopped/);
  assert.match(s.banner, /Restart engine/);
  assert.equal(s.evals, 0);
  assert.match(s.status, /Engine error/);
  assert.equal(await page.textContent('#legal-count'), '20', 'rules features keep working');
});

test('corrupt NNUE file is detected by its SHA-256', { timeout: 120000 }, async (t) => {
  const { page } = await openApp(t, { routes: [[/nnue\.part1$/, (r) => r.fulfill({ status: 200, body: Buffer.alloc(1000, 7) })]] });
  await page.waitForFunction(() => __app.engine.state === 'error', null, { timeout: 60000 });
  assert.equal(await app(page, () => __app.engine.error.code), 'nnue-corrupt');
});

test('missing engine script: reported as a missing file', { timeout: 120000 }, async (t) => {
  const { page } = await openApp(t, { routes: [[/stockfish-19(-relaxed)?\.js$/, (r) => r.fulfill({ status: 404, body: '' })]] });
  await page.waitForFunction(() => __app.engine.state === 'error', null, { timeout: 90000 });
  const e = await app(page, () => __app.engine.error);
  assert.equal(e.code, 'missing-file');
});

test('missing opening database: useful error instead of fake recognition', { timeout: 60000 }, async (t) => {
  const { page } = await openApp(t, { routes: [[/openings\.json$/, (r) => r.fulfill({ status: 404, body: '' })]] });
  await page.click('#engine-toggle + .slider');
  await page.waitForFunction(() => /Opening database unavailable/.test(document.querySelector('#opening-line').textContent));
  assert.match(await page.textContent('#opening-line'), /HTTP 404/);
});

test('without cross-origin isolation the app explains how to start it and still works without the engine', { timeout: 60000 }, async (t) => {
  const plain = await startPlainServer();
  t.after(() => plain.stop());
  const { page } = await openApp(t, { url: plain.url });
  await page.waitForSelector('#banner:not(.hidden)');
  assert.match(await page.textContent('#banner'), /cross-origin isolated/);
  assert.equal(await page.textContent('#legal-count'), '20');
  await clickMove(page, 'e2', 'e4');
  assert.equal(await page.textContent('#legal-count'), '20');
  assert.equal(await app(page, () => __app.node.san), 'e4');
});

test('worker clean-up and preference persistence', { timeout: 120000 }, async (t) => {
  const { page } = await openApp(t, { clearStorage: true });
  await engineReady(page);
  await page.click('#theme-toggle');
  await page.selectOption('#multipv-input', '4');
  await page.click('#engine-toggle + .slider');
  await page.waitForFunction(() => __app.engine.state === 'off');
  const w = await app(page, () => window.__workers);
  assert.ok(w.terminated >= 1, 'engine worker terminated when switched off');
  await page.reload();
  const p = await app(page, () => ({ theme: document.documentElement.dataset.theme, multipv: document.querySelector('#multipv-input').value, engine: __app.engine.state }));
  assert.equal(p.theme, 'light');
  assert.equal(p.multipv, '4');
  assert.equal(p.engine, 'off', 'engine on/off preference remembered');
});
