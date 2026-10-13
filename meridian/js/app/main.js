/* Meridian — boot */
(function () {
  'use strict';
  const start = () => {
    try { window.M.boot(); }
    catch (e) {
      console.error(e);
      document.getElementById('main').innerHTML = `<div class="note error">Meridian failed to start: ${String(e && e.message || e).replace(/</g, '&lt;')}. Please use a current version of Chrome, Edge, Firefox or Safari.</div>`;
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
