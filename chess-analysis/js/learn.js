// Learning Center: lessons with explanations, diagrams, worked examples,
// rule-verified interactive exercises, quizzes, a puzzle mode and local progress.
import { Chess, parseUci } from './chess-util.js';
import { Board, destsFromChess, checkSquare } from './board.js';
import { escapeHtml } from './app.js';
import { SECTIONS, LESSONS, EXTRA_PUZZLES } from './lessons/index.js';
import { squareSet, countKind, classifyPosition, MOVE_PREDICATES, hangingPieces } from './learn-rules.js';

const $ = (s) => document.querySelector(s);
const STORE = 'ca.learn';
const CLASSIFY_OPTIONS = [
  ['checkmate', 'Checkmate'], ['stalemate', 'Stalemate (draw)'], ['insufficient', 'Draw: insufficient material'],
  ['fifty', 'Fifty-move rule: draw can be claimed'], ['check', 'Check (game continues)'], ['play', 'Game continues (no check)'],
];

function loadProgress() {
  try { return { done: {}, ex: {}, quiz: {}, puzzles: {}, ...JSON.parse(localStorage.getItem(STORE)) }; } catch { return { done: {}, ex: {}, quiz: {}, puzzles: {} }; }
}

function sanToUci(fen, san) {
  const c = new Chess(fen);
  try {
    const m = /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(san) ? c.move(parseUci(san)) : c.move(san);
    return m.lan;
  } catch { return null; }
}

export function initLearn(app) {
  const progress = loadProgress();
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch { /* ignore */ } };
  const main = $('#learn-main');
  const toc = $('#learn-toc');
  let current = null;
  let boards = [];

  function lessonComplete(l) {
    const exOk = !l.exercise || progress.ex[l.id];
    const quizOk = !l.quiz || progress.quiz[l.id];
    return exOk && quizOk;
  }

  function renderToc() {
    const doneCount = LESSONS.filter((l) => progress.done[l.id]).length;
    $('#learn-progress').innerHTML = `<strong>${doneCount}</strong> of ${LESSONS.length} lessons completed<div class="progress"><div style="width:${(doneCount / LESSONS.length) * 100}%"></div></div>`;
    toc.innerHTML = SECTIONS.map((s) => {
      const ls = LESSONS.filter((l) => l.section === s.id);
      return `<h3>${escapeHtml(s.title)}</h3><ul>${ls.map((l) => `<li><button data-lesson="${l.id}" class="${current === l.id ? 'current' : ''}"><span class="${progress.done[l.id] ? 'done' : 'muted'}" aria-hidden="true">${progress.done[l.id] ? '✓' : '○'}</span><span>${escapeHtml(l.title)}</span>${progress.done[l.id] ? '<span class="sr-only">(completed)</span>' : ''}</button></li>`).join('')}</ul>`;
    }).join('');
  }

  toc.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lesson]');
    if (b) openLesson(b.dataset.lesson);
  });
  $('#puzzle-mode-btn').addEventListener('click', () => openPuzzles());

  function makeBoard(el, orientation = 'w') {
    const b = new Board(el, { mode: 'view' });
    b.setOrientation(orientation);
    boards.push(b);
    return b;
  }

  function showFen(board, fen, extra = {}) {
    const c = new Chess(fen);
    board.set({ fen, check: checkSquare(c), dests: new Map(), lastMove: null, arrows: [], marks: new Map(), mode: 'view', ...extra });
  }

  function arrowsOf(list) {
    return (list || []).map((a) => (typeof a === 'string' ? { from: a.slice(0, 2), to: a.slice(2, 4), color: 'var(--c-best)' } : a));
  }
  function marksOf(obj) { return new Map(Object.entries(obj || {})); }

  function openLesson(id) {
    const l = LESSONS.find((x) => x.id === id);
    if (!l) return;
    current = id;
    app.savePrefs({ lesson: id });
    boards = [];
    const idx = LESSONS.indexOf(l);
    const section = SECTIONS.find((s) => s.id === l.section);
    main.innerHTML = `
      <p><span class="tag">${escapeHtml(section.title)}</span><span class="tag">${escapeHtml(l.level || 'Beginner')}</span></p>
      <h1>${escapeHtml(l.title)}</h1>
      <div class="lesson-body">${l.body}</div>
      ${l.keyPoints ? `<div class="key-points"><strong>Key points</strong><ul>${l.keyPoints.map((k) => `<li>${k}</li>`).join('')}</ul></div>` : ''}
      <h2>Diagram${l.example ? ' &amp; worked example' : ''}</h2>
      <div class="lesson-grid">
        <div><div class="lesson-board"><div id="lb-diagram"></div></div><div class="lesson-caption" id="lb-caption"></div></div>
        <div class="example-steps" id="lb-example"></div>
      </div>
      ${l.exercise ? `<h2>Exercise</h2><div class="lesson-grid"><div><div class="lesson-board"><div id="lb-ex"></div></div></div><div id="lb-ex-panel"></div></div>` : ''}
      ${l.quiz ? `<h2>Review question</h2><div class="quiz" id="lb-quiz"></div>` : ''}
      <div class="lesson-nav">
        <button id="lb-prev" ${idx === 0 ? 'disabled' : ''}>← ${idx > 0 ? escapeHtml(LESSONS[idx - 1].title) : ''}</button>
        <button id="lb-next" class="primary" ${idx === LESSONS.length - 1 ? 'disabled' : ''}>${idx < LESSONS.length - 1 ? escapeHtml(LESSONS[idx + 1].title) : ''} →</button>
      </div>`;
    $('#lb-prev').addEventListener('click', () => openLesson(LESSONS[idx - 1].id));
    $('#lb-next').addEventListener('click', () => openLesson(LESSONS[idx + 1].id));
    setupDiagram(l);
    if (l.exercise) setupExercise(l.exercise, $('#lb-ex'), $('#lb-ex-panel'), () => { progress.ex[l.id] = true; checkDone(l); });
    if (l.quiz) setupQuiz(l);
    renderToc();
    main.focus();
    main.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function checkDone(l) {
    if (lessonComplete(l) && !progress.done[l.id]) {
      progress.done[l.id] = true;
      app.toast(`Lesson completed: ${l.title}`);
    }
    save();
    renderToc();
  }

  function setupDiagram(l) {
    const d = l.diagram;
    const board = makeBoard($('#lb-diagram'), d.orientation || 'w');
    const cap = $('#lb-caption');
    const showDiagram = () => {
      showFen(board, d.fen, { arrows: arrowsOf(d.arrows), marks: marksOf(d.marks) });
      cap.innerHTML = d.caption || '';
    };
    showDiagram();
    const exEl = $('#lb-example');
    const ex = l.example;
    if (!ex) { exEl.innerHTML = ''; return; }
    // Pre-compute positions with the rules library; an illegal step would be a content bug.
    const positions = [{ fen: ex.fen, text: ex.intro || '', last: null }];
    const c = new Chess(ex.fen);
    for (const step of ex.steps) {
      let m = null;
      if (step.move) {
        try { m = c.move(step.move); } catch { positions.push({ fen: c.fen(), text: `<span class="error-text">Lesson error: illegal move ${escapeHtml(step.move)}</span>` }); break; }
      }
      positions.push({ fen: c.fen(), text: step.text, last: m ? { from: m.from, to: m.to } : null, san: m?.san, arrows: step.arrows, marks: step.marks, num: m ? (m.color === 'w' ? `${m.before.split(' ')[5]}.` : `${m.before.split(' ')[5]}…`) : '' });
    }
    let i = -1;
    exEl.innerHTML = `<h3>${escapeHtml(ex.title || 'Worked example')}</h3>
      <div class="step-text" id="ex-text" aria-live="polite">Press <strong>Next</strong> to step through the example on the board.</div>
      <div class="row"><button id="ex-prev">◀ Previous</button><button id="ex-next" class="primary">Next ▶</button><button id="ex-reset">Back to diagram</button><span class="muted small" id="ex-count"></span></div>`;
    const render = () => {
      if (i < 0) { showDiagram(); $('#ex-text').innerHTML = 'Press <strong>Next</strong> to step through the example on the board.'; $('#ex-count').textContent = ''; return; }
      const p = positions[i];
      const pc = new Chess(p.fen);
      board.set({ fen: p.fen, lastMove: p.last, check: checkSquare(pc), arrows: arrowsOf(p.arrows), marks: marksOf(p.marks) });
      $('#ex-text').innerHTML = `${p.san ? `<strong>${p.num} ${escapeHtml(p.san)}</strong> — ` : ''}${p.text}`;
      $('#ex-count').textContent = `Step ${i + 1} of ${positions.length}`;
    };
    $('#ex-prev').addEventListener('click', () => { if (i > -1) { i--; render(); } });
    $('#ex-next').addEventListener('click', () => { if (i < positions.length - 1) { i++; render(); } });
    $('#ex-reset').addEventListener('click', () => { i = -1; render(); });
  }

  // -------------------------------------------------------------- exercises
  function setupExercise(ex, boardEl, panel, onSolved) {
    const fen = ex.fen;
    const turn = fen.split(' ')[1];
    const board = makeBoard(boardEl, ex.orientation || turn);
    let chess = new Chess(fen);
    let step = 0; // index into solution (for 'line')
    let solved = false;
    let selected = new Set();
    panel.innerHTML = `<p class="exercise-prompt"><strong>${turn === 'w' ? 'White' : 'Black'} to move.</strong> ${ex.prompt}</p>
      <div id="fb" class="feedback info" aria-live="polite">${hintFor(ex)}</div>
      <div class="ex-extra"></div>
      <div class="row wrap"><button class="ex-reset">Reset</button>${ex.hint ? '<button class="ex-hint">Hint</button>' : ''}<button class="ex-solution">Show solution</button></div>`;
    const fb = panel.querySelector('#fb');
    fb.removeAttribute('id');
    const extra = panel.querySelector('.ex-extra');
    const feedback = (cls, html) => { fb.className = `feedback ${cls}`; fb.innerHTML = html; };

    const setPlayable = () => {
      const playable = !solved && ['mate', 'line', 'predicate'].includes(ex.type) && chess.turn() === turn;
      board.set({ fen: chess.fen(), check: checkSquare(chess), dests: playable ? destsFromChess(chess) : new Map(), turnColor: chess.turn(), mode: playable ? 'play' : 'view', marks: squaresMarks() });
    };
    const squaresMarks = () => new Map([...selected].map((s) => [s, 'info']));

    const success = (html) => {
      solved = true;
      feedback('ok', `✔ ${html}${ex.explanation ? `<br>${ex.explanation}` : ''}`);
      setPlayable();
      onSolved();
    };

    const undoLast = (delay = 1100) => {
      setTimeout(() => {
        if (solved) return;
        chess.undo();
        setPlayable();
      }, delay);
    };

    board.opts.onMove = (from, to, promotion) => {
      if (solved) return;
      let m;
      try { m = chess.move({ from, to, promotion }); } catch { setPlayable(); return; }
      setPlayable();
      board.set({ lastMove: { from, to } });
      if (ex.type === 'mate') {
        if (chess.isCheckmate()) return success(`${m.san} is checkmate.`);
        if (chess.isStalemate()) { feedback('bad', `${m.san} is <strong>stalemate</strong> — the opponent has no legal move but is not in check, so the game is a draw. Try again.`); return undoLast(); }
        const replies = chess.moves();
        feedback('bad', `${m.san} is not checkmate: the opponent has ${replies.length} legal repl${replies.length === 1 ? 'y' : 'ies'}, for example <strong>${escapeHtml(replies[0])}</strong>. Try again.`);
        return undoLast();
      }
      if (ex.type === 'predicate') {
        const before = new Chess(m.before);
        const r = MOVE_PREDICATES[ex.predicate](m, ex, before);
        if (r.ok) return success(`${m.san} — correct.`);
        feedback('bad', `${escapeHtml(m.san)}: ${escapeHtml(r.why)}`);
        return undoLast();
      }
      if (ex.type === 'line') {
        const beforeFen = m.before;
        const accepted = [ex.solution[step], ...((ex.accept && ex.accept[step / 2]) || [])].map((s) => sanToUci(beforeFen, s)).filter(Boolean);
        if (accepted.includes(m.lan) || chess.isCheckmate()) {
          step++;
          if (chess.isCheckmate() || step >= ex.solution.length) return success(`${m.san}${chess.isCheckmate() ? ' — checkmate!' : ' — well done!'}`);
          feedback('ok', `${escapeHtml(m.san)} — correct! ${ex.notes?.[step - 1] || ''} Opponent replies…`);
          setTimeout(() => {
            if (solved) return;
            const reply = chess.move(ex.solution[step]);
            step++;
            board.set({ lastMove: { from: reply.from, to: reply.to } });
            setPlayable();
            board.set({ lastMove: { from: reply.from, to: reply.to } });
            if (step >= ex.solution.length) { success(`${escapeHtml(reply.san)} — line complete.`); return; }
            feedback('info', `${escapeHtml(reply.san)}. ${ex.notes?.[step - 1] || 'Your move.'}`);
          }, 550);
          return;
        }
        // Wrong move: explain using the rules, not guesses.
        const hanging = hangingPieces(chess, m.color).includes(m.to);
        let why = `${escapeHtml(m.san)} is legal, but it is not the strongest move here.`;
        const mateReply = chess.moves({ verbose: true }).find((r) => { chess.move(r); const x = chess.isCheckmate(); chess.undo(); return x; });
        if (chess.isStalemate()) why = `${escapeHtml(m.san)} stalemates the opponent — a draw.`;
        else if (mateReply) why = `${escapeHtml(m.san)} allows ${escapeHtml(mateReply.san)}, checkmate.`;
        else if (hanging) why += ` The ${({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' })[m.piece]} on ${m.to} could simply be captured.`;
        feedback('bad', `${why} Try again.`);
        undoLast();
      }
    };

    if (ex.type === 'count') {
      extra.innerHTML = `<div class="row"><label>Your answer <input type="number" min="0" class="ex-count-input"></label><button class="primary ex-check">Check</button></div>`;
      extra.querySelector('.ex-check').addEventListener('click', () => {
        const val = Number(extra.querySelector('.ex-count-input').value);
        const truth = countKind(fen, ex.kind);
        if (val === truth) success(`Yes — exactly ${truth}.`);
        else feedback('bad', `Not ${Number.isFinite(val) ? val : 'that'}. ${val < truth ? 'There are more.' : 'There are fewer.'} Count again (remember: moves that leave your own king in check are not legal).`);
      });
    }
    if (ex.type === 'squares') {
      extra.innerHTML = `<p class="small muted">Click squares on the board to select or deselect them, then press Check.</p><div class="row"><button class="primary ex-check">Check</button><button class="ex-clear">Clear selection</button></div>`;
      board.mode = 'view';
      board.el.addEventListener('pointerdown', (e) => {
        if (solved) return;
        const sq = board.squareAt(e.clientX, e.clientY);
        if (!sq) return;
        const key = ex.kind === 'open-files' ? `${sq[0]}*` : sq;
        if (selected.has(key)) selected.delete(key); else selected.add(key);
        board.set({ marks: ex.kind === 'open-files' ? fileMarks() : squaresMarks() });
      });
      const fileMarks = () => {
        const m = new Map();
        for (const k of selected) for (let r = 1; r <= 8; r++) m.set(k[0] + r, 'info');
        return m;
      };
      extra.querySelector('.ex-clear').addEventListener('click', () => { selected = new Set(); board.set({ marks: new Map() }); });
      extra.querySelector('.ex-check').addEventListener('click', () => {
        const truth = new Set(squareSet(fen, ex.kind, ex.color || turn));
        const missing = [...truth].filter((s) => !selected.has(s));
        const wrong = [...selected].filter((s) => !truth.has(s));
        const fmt = (arr) => arr.map((s) => (s.endsWith('*') ? `${s[0]}-file` : s)).join(', ');
        if (!missing.length && !wrong.length) {
          success(truth.size ? `Correct: ${fmt([...truth])}.` : 'Correct — there are none.');
          board.set({ marks: new Map([...truth].filter((s) => !s.endsWith('*')).map((s) => [s, 'good'])) });
        } else {
          feedback('bad', `${missing.length ? `You missed ${missing.length}. ` : ''}${wrong.length ? `${fmt(wrong)} ${wrong.length === 1 ? 'does' : 'do'} not qualify. ` : ''}Try again.`);
        }
      });
    }
    if (ex.type === 'classify') {
      const items = ex.positions;
      let k = 0;
      const show = () => {
        chess = new Chess(items[k].fen);
        showFen(board, items[k].fen);
        extra.innerHTML = `<p class="small">Position ${k + 1} of ${items.length}${items[k].note ? ` — ${items[k].note}` : ''}. ${chess.turn() === 'w' ? 'White' : 'Black'} to move. What is the status?</p>
          <div class="options">${CLASSIFY_OPTIONS.map(([v, t]) => `<button data-v="${v}">${t}</button>`).join('')}</div>`;
        extra.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
          const truth = classifyPosition(items[k].fen);
          if (b.dataset.v === truth) {
            b.classList.add('right');
            if (k < items.length - 1) { feedback('ok', `Correct. ${items[k].explain || ''}`); k++; setTimeout(show, 900); }
            else success(`Correct. ${items[k].explain || ''}`);
          } else {
            b.classList.add('wrong');
            feedback('bad', 'Not quite — check every legal move for the side to move.');
          }
        }));
      };
      show();
    }

    panel.querySelector('.ex-reset').addEventListener('click', () => {
      chess = new Chess(fen);
      step = 0;
      solved = false;
      selected = new Set();
      feedback('info', hintFor(ex));
      if (ex.type === 'classify') setupExercise(ex, boardEl, panel, onSolved);
      else setPlayable();
    });
    panel.querySelector('.ex-hint')?.addEventListener('click', () => feedback('info', `Hint: ${ex.hint}`));
    panel.querySelector('.ex-solution').addEventListener('click', () => {
      let html = '';
      if (ex.type === 'line') html = `Solution: <strong>${escapeHtml(ex.solution.join(' '))}</strong>.`;
      else if (ex.type === 'mate') {
        const mates = new Chess(fen).moves({ verbose: true }).filter((m) => /#$/.test(m.san)).map((m) => m.san);
        html = `Mating move${mates.length > 1 ? 's' : ''} (found by the rules engine): <strong>${escapeHtml(mates.join(', '))}</strong>.`;
      } else if (ex.type === 'count') html = `The rules library counts <strong>${countKind(fen, ex.kind)}</strong>.`;
      else if (ex.type === 'squares') {
        const t = squareSet(fen, ex.kind, ex.color || turn);
        html = t.length ? `Answer: <strong>${t.map((s) => (s.endsWith('*') ? `${s[0]}-file` : s)).join(', ')}</strong>.` : 'Answer: none.';
        board.set({ marks: new Map(t.filter((s) => !s.endsWith('*')).map((s) => [s, 'good'])) });
      } else if (ex.type === 'predicate') html = ex.solutionText || 'See the explanation below.';
      else if (ex.type === 'classify') html = ex.positions.map((p, i) => `${i + 1}: ${CLASSIFY_OPTIONS.find((o) => o[0] === classifyPosition(p.fen))[1]}`).join('<br>');
      feedback('info', `${html}${ex.explanation ? `<br>${ex.explanation}` : ''}`);
    });
    if (ex.type !== 'classify') setPlayable();
  }

  function hintFor(ex) {
    return {
      mate: 'Find a move that checkmates. The rules engine checks your move.',
      line: 'Play the best move on the board. Opponent replies are played automatically.',
      predicate: 'Play a move on the board that does what the task asks.',
      count: 'Type the number and press Check. The rules library computes the true answer.',
      squares: 'Select the squares that answer the question.',
      classify: 'Pick the correct status for each position.',
    }[ex.type] || '';
  }

  function setupQuiz(l) {
    const q = l.quiz;
    const el = $('#lb-quiz');
    el.innerHTML = `<p><strong>${q.q}</strong></p><div class="options">${q.options.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div><div class="quiz-fb" aria-live="polite"></div>`;
    el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.i);
      const fb = el.querySelector('.quiz-fb');
      if (i === q.answer) {
        b.classList.add('right');
        fb.innerHTML = `<div class="feedback ok">✔ Correct. ${q.explain || ''}</div>`;
        progress.quiz[l.id] = true;
        checkDone(l);
      } else {
        b.classList.add('wrong');
        fb.innerHTML = `<div class="feedback bad">Not quite. ${q.wrongHint || 'Re-read the explanation above and try again.'}</div>`;
      }
    }));
  }

  // -------------------------------------------------------------- puzzles
  function allPuzzles() {
    const fromLessons = LESSONS.filter((l) => l.exercise && ['mate', 'line'].includes(l.exercise.type)).map((l) => ({ id: `lesson:${l.id}`, title: l.title, ex: l.exercise }));
    return [...fromLessons, ...EXTRA_PUZZLES.map((p) => ({ id: `puzzle:${p.id}`, title: p.title, ex: p }))];
  }

  function openPuzzles(startId) {
    current = null;
    boards = [];
    renderToc();
    const list = allPuzzles();
    const unsolved = list.filter((p) => !progress.puzzles[p.id]);
    const pool = unsolved.length ? unsolved : list;
    const pz = startId ? list.find((p) => p.id === startId) : pool[Math.floor(Math.random() * pool.length)];
    const solvedCount = list.filter((p) => progress.puzzles[p.id]).length;
    main.innerHTML = `<h1>Puzzle mode</h1>
      <p class="muted">${solvedCount} of ${list.length} puzzles solved. Every move is checked with the rules library; checkmates are accepted by verifying the position, not by matching a square.</p>
      <h2>${escapeHtml(pz.title)}</h2>
      <div class="lesson-grid"><div><div class="lesson-board"><div id="pz-board"></div></div></div><div><div id="pz-panel"></div><div class="row"><button id="pz-next" class="primary">Next puzzle</button></div></div></div>`;
    setupExercise(pz.ex, $('#pz-board'), $('#pz-panel'), () => { progress.puzzles[pz.id] = true; save(); });
    $('#pz-next').addEventListener('click', () => openPuzzles());
  }

  app.onChange((k) => {
    if (k === 'view' && app.view === 'learn' && !main.innerHTML) {
      const last = app.prefs.lesson && LESSONS.find((l) => l.id === app.prefs.lesson);
      openLesson(last ? last.id : LESSONS[0].id);
    }
  });
  app.learn = { openLesson, openPuzzles, LESSONS, progress };
  renderToc();
}
