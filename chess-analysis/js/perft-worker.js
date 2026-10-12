// Worker running the exact sequence counter off the UI thread.
// Cancellation is done by the page terminating this worker.
import { countSequences } from './perft-core.js';

self.onmessage = (e) => {
  const { id, fen, depth } = e.data;
  const t0 = performance.now();
  try {
    const res = countSequences(fen, depth, (p) => {
      self.postMessage({ id, type: 'progress', done: p.done, total: p.total, move: p.move, partial: p.partial.toString() });
    });
    self.postMessage({
      id, type: 'done', fen, depth, total: res.total.toString(), nodes: res.nodes,
      divide: res.divide.map((d) => ({ san: d.san, uci: d.uci, count: d.count.toString() })),
      ms: performance.now() - t0,
    });
  } catch (err) {
    self.postMessage({ id, type: 'error', message: err.message });
  }
};
