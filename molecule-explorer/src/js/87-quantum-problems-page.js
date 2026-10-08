/* The practice page, last in the reading order.
 *
 * Grouped the same way the tab is, so a reader who has just finished a group
 * can find the problems that belong to it. Every question is generated fresh
 * and graded by the engine that produced the worked examples.
 */
(function () {
  'use strict';
  const ME = window.ME;
  const el = ME.el;
  const K = ME.kit;
  const { p, b } = K;
  const { h3 } = ME.quantumInternals;

  const GROUPS = [
    ['Where it came from', ['qm-history', 'qm-wien', 'qm-photoelectric', 'qm-threshold',
      'qm-compton', 'qm-debroglie', 'qm-bohr']],
    ['Reading the equation', ['qm-which-equation', 'qm-psi-meaning', 'qm-box-thinking']],
    ['The box, the well and the barrier', ['qm-box-energy', 'qm-box-jump', 'qm-box-probability',
      'qm-box-nodes', 'qm-tunnel', 'qm-tunnel-thinking', 'qm-uncertainty']],
    ['Spin, shells and the table', ['qm-angular', 'qm-shells', 'qm-zeeman', 'qm-fermion-boson',
      'qm-moseley']],
    ['Light and colour', ['qm-photon', 'qm-hydrogen-level', 'qm-hydrogen-line', 'qm-hydrogen-series',
      'qm-selection', 'qm-colour', 'qm-oscillator', 'qm-beer', 'qm-boltzmann']],
    ['Solids and the strange part', ['qm-bandgap', 'qm-decay', 'qm-bell']],
  ];

  ME.quantumPage('Practice', 'problems', 'Problems',
    'Thirty-four kinds, endlessly regenerated', () => {
      const wrap = el('div');
      wrap.appendChild(p('Every one of these is generated fresh and the answer is computed rather '
        + 'than stored, so what you are marked against is what the worked examples would give. '
        + 'Press for a new set as often as you like — the numbers change every time.'));
      wrap.appendChild(p(b('A note on the conceptual ones. '), 'About a third of these have no '
        + 'arithmetic in them at all. That is deliberate: the commonest way to be wrong about '
        + 'quantum mechanics is not to miscalculate, it is to carry a picture that quietly '
        + 'contradicts the experiments.'));

      GROUPS.forEach(([name, keys]) => {
        const live = keys.filter((k) => ME.practice.keys.indexOf(k) >= 0);
        if (!live.length) return;
        wrap.appendChild(h3(name));
        const holder = el('div', { class: 'qm-problems' });
        let seed = (Math.random() * 1e9) | 0;
        const fill = () => {
          ME.clear(holder);
          live.forEach((k, i) => {
            const q = ME.practice.generate(k, seed + i * 7919);
            if (q) holder.appendChild(ME.quiz.buildQuestion(q, i, live.length, false, null));
          });
        };
        const again = el('button', { class: 'btn btn-sm', text: 'New set' });
        again.addEventListener('click', () => { seed = (Math.random() * 1e9) | 0; fill(); });
        wrap.appendChild(holder);
        wrap.appendChild(again);
        fill();
      });
      return wrap;
    });
})();
