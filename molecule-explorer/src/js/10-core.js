/* Shared namespace, DOM helpers and small UI primitives. */
window.ME = window.ME || {};

(function () {
  'use strict';

  const ME = window.ME;

  /* ------------------------------------------------------------- DOM utils */
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach((c) => {
        if (c == null || c === false) return;
        n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      });
    }
    return n;
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* Molecular formulas read much better with real subscripts. For a string
   * that is nothing but a formula, every digit is a subscript. */
  function formulaHTML(f) {
    if (!f) return '';
    return esc(f)
      .replace(/(\d+)/g, '<sub>$1</sub>')
      .replace(/([+-])(?=$|\D)/g, '<sup>$1</sup>');
  }

  /* Prose with formulas in it, which is most of the teaching text. The rules
   * above cannot be used here: they would turn "109.5" into 109 with a
   * subscript 5, and superscript the plus in "2 + 6 = 8".
   *
   * So a digit run is a subscript only when a letter or a closing bracket
   * comes immediately before it, and a plus or minus is a charge only when
   * what precedes it looks like a chemical symbol or a subscript and nothing
   * word-like follows. That leaves hyphenated words, ranges, dates, decimals
   * and arithmetic alone.
   *
   * The charge pass runs first, because after the subscript pass the character
   * before a charge sign is the ">" of a tag rather than the digit. */
  function chemHTML(t) {
    if (!t) return '';
    return esc(t)
      .replace(/((?:\b[A-Za-z][a-z]?)|(?:[A-Z]{1,3})|\d|\)|\])([+\u2212-])(?![A-Za-z0-9])/g,
        '$1<sup>$2</sup>')
      .replace(/([A-Za-z)\]])(\d+)/g, '$1<sub>$2</sub>');
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(self, args), ms);
    };
  }

  /* --------------------------------------------------------------- storage */
  /* localStorage is unavailable in some privacy modes and throws when full,
   * so every access is guarded and the app works fine without it. */
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('molx.' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('molx.' + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove(key) {
      try { localStorage.removeItem('molx.' + key); } catch (e) { /* nothing to do */ }
    },
  };

  /* ----------------------------------------------------------------- toast */
  let toastNode, toastTimer;
  function toast(msg) {
    if (!toastNode) {
      toastNode = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastNode);
    }
    toastNode.textContent = msg;
    toastNode.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastNode.classList.remove('show'), 2100);
  }

  /* --------------------------------------------------------------- tooltip */
  let tipNode;
  function tipEnsure() {
    if (!tipNode) {
      tipNode = el('div', { class: 'tip', role: 'tooltip' });
      document.body.appendChild(tipNode);
    }
    return tipNode;
  }
  function showTip(text, x, y) {
    const t = tipEnsure();
    t.textContent = text;
    t.classList.add('show');
    const r = t.getBoundingClientRect();
    let left = x - r.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - r.width - 8));
    let top = y - r.height - 12;
    if (top < 8) top = y + 18;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }
  function hideTip() { if (tipNode) tipNode.classList.remove('show'); }

  /* Attach a hover/tap definition to any element with data-tip. */
  function bindTips(root) {
    $$('[data-tip]', root).forEach((node) => {
      if (node.__tipBound) return;
      node.__tipBound = true;
      const show = (ev) => {
        const r = node.getBoundingClientRect();
        showTip(node.getAttribute('data-tip'), r.left + r.width / 2, r.top);
        if (ev.type === 'click') setTimeout(hideTip, 3200);
      };
      node.addEventListener('mouseenter', show);
      node.addEventListener('focus', show);
      node.addEventListener('click', show);
      node.addEventListener('mouseleave', hideTip);
      node.addEventListener('blur', hideTip);
    });
  }

  /* ------------------------------------------------------------ clipboard */
  function copy(text, label) {
    const done = () => toast((label || 'Copied') + ' ✓');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallback());
    } else fallback();
    function fallback() {
      /* execCommand still matters here: a file:// page in an older browser has
       * no async clipboard API. */
      const ta = el('textarea', { style: { position: 'fixed', opacity: '0', top: '0' } });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { toast('Could not copy — select the text and copy manually'); }
      document.body.removeChild(ta);
    }
  }

  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  /* --------------------------------------------------------------- icons */
  const ICONS = {
    search: 'M11 4a7 7 0 1 0 4.19 12.6l3.6 3.6 1.42-1.42-3.6-3.6A7 7 0 0 0 11 4zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
    x: 'M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z',
    sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM11 1h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM3.5 4.9 4.9 3.5 7 5.6 5.6 7zM17 18.4l1.4-1.4 2.1 2.1-1.4 1.4zM18.4 7 17 5.6l2.1-2.1 1.4 1.4zM5.6 17 7 18.4l-2.1 2.1-1.4-1.4z',
    moon: 'M12.3 2a9 9 0 1 0 9.4 11.6A7.5 7.5 0 0 1 12.3 2z',
    copy: 'M9 2h9a2 2 0 0 1 2 2v11h-2V4H9zM5 6h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2v12h9V8z',
    check: 'M9.6 16.2 4.8 11.4l1.4-1.4 3.4 3.4 8-8 1.4 1.4z',
    undo: 'M8 7V3L2 8l6 5v-4h5a4 4 0 0 1 0 8h-3v2h3a6 6 0 0 0 0-12z',
    redo: 'M16 7V3l6 5-6 5V9h-5a4 4 0 0 0 0 8h3v2h-3a6 6 0 0 1 0-12z',
    trash: 'M9 3h6l1 1h4v2H4V4h4zm-3 5h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z',
    erase: 'M16.2 3.4 21 8.2a2 2 0 0 1 0 2.8l-8 8H21v2H8.5a2 2 0 0 1-1.4-.6l-4.3-4.3a2 2 0 0 1 0-2.8L13.4 3.4a2 2 0 0 1 2.8 0zM7.9 12 5 14.9l4.3 4.3h1.4l3.2-3.2z',
    wand: 'm14.7 2.3 2 2-2.3 2.3-2-2zM2 17.3 12.9 6.4l2 2L4 19.3V21H2.3zM19 8l1 2.2 2.2 1-2.2 1L19 14.4 18 12.2 15.8 11.2l2.2-1z',
    download: 'M11 3h2v9.6l3.3-3.3 1.4 1.4L12 16.4 6.3 10.7l1.4-1.4L11 12.6zM4 18h16v2H4z',
    open: 'M10 3v2H5v14h14v-5h2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm4 0h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14z',
    back: 'M11.4 5 12.8 6.4 8.2 11H20v2H8.2l4.6 4.6L11.4 19l-7-7z',
    flask: 'M9 2h6v2h-1v5.2l5.3 9.2A2 2 0 0 1 17.6 21H6.4a2 2 0 0 1-1.7-2.6L10 9.2V4H9zm3 2v5.7L8.1 16h7.8L12 9.7z',
    globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3a15 15 0 0 0-1.2-5.4A8 8 0 0 1 18.9 11zM12 4.2c.8 1.2 1.6 3.4 1.8 6.8h-3.6c.2-3.4 1-5.6 1.8-6.8zM9.3 5.6A15 15 0 0 0 8.1 11h-3a8 8 0 0 1 4.2-5.4zM5.1 13h3a15 15 0 0 0 1.2 5.4A8 8 0 0 1 5.1 13zM12 19.8c-.8-1.2-1.6-3.4-1.8-6.8h3.6c-.2 3.4-1 5.6-1.8 6.8zm2.7-1.4a15 15 0 0 0 1.2-5.4h3a8 8 0 0 1-4.2 5.4z',
    book: 'M4 3h9a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H4zm16 0h-2.5A4.5 4.5 0 0 1 18 6v14a3 3 0 0 1 2-2.8z',
    grid: 'M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z',
    pencil: 'm14.1 3.5 6.4 6.4-9.9 9.9-6.4.9.9-6.4zM15.5 2.1l2.4-2.4 6.4 6.4-2.4 2.4z',
    cube: 'M12 2 3 7v10l9 5 9-5V7zm0 2.3 6.5 3.6L12 11.5 5.5 7.9zM5 9.7l6 3.3v6.4l-6-3.3zm14 0v6.4l-6 3.3V13z',
    rotate: 'M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z',
    chevron: 'M8.6 5.4 7.2 6.8 12.4 12l-5.2 5.2 1.4 1.4L15.2 12z',
    warn: 'M12 2 1.5 21h21zm0 4.3 7 12.7H5zM11 10h2v5h-2zm0 6h2v2h-2z',
  };

  function icon(name, cls) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    /* An SVG with no intrinsic size fills whatever contains it. Give every icon
     * a default of one em; component CSS overrides it where a fixed size is
     * wanted, because a CSS width always beats a presentation attribute. */
    svg.setAttribute('width', '1em');
    svg.setAttribute('height', '1em');
    svg.style.flex = 'none';
    svg.style.verticalAlign = '-0.125em';
    if (cls) svg.setAttribute('class', cls);
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', ICONS[name] || '');
    svg.appendChild(p);
    return svg;
  }

  /* ----------------------------------------------------------------- theme */
  const theme = {
    apply(mode) {
      if (mode === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', mode);
      store.set('theme', mode);
      ME.bus.emit('theme', theme.effective());
    },
    current() { return store.get('theme', 'system'); },
    effective() {
      const m = theme.current();
      if (m !== 'system') return m;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    cycle() {
      const order = ['system', 'light', 'dark'];
      const next = order[(order.indexOf(theme.current()) + 1) % order.length];
      theme.apply(next);
      toast(next === 'system' ? 'Following your system theme' : next === 'dark' ? 'Dark mode' : 'Light mode');
    },
  };

  /* ------------------------------------------------------------------- bus */
  const listeners = {};
  const bus = {
    on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return () => bus.off(evt, fn); },
    off(evt, fn) { if (listeners[evt]) listeners[evt] = listeners[evt].filter((f) => f !== fn); },
    emit(evt, data) { (listeners[evt] || []).forEach((f) => { try { f(data); } catch (e) { console.error(e); } }); },
  };

  Object.assign(ME, { el, $, $$, clear, esc, formulaHTML, chemHTML, debounce, store, toast, showTip, hideTip, bindTips, copy, download, icon, theme, bus });
})();
