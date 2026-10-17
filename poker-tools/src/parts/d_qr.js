
/* =====================================================================
   8. QR CODE GENERATOR  (tiny inline encoder: byte mode, ECC level M)
   Follows ISO/IEC 18004; structure after Project Nayuki's public-domain-style
   reference design. No remote QR service is ever contacted.
   ===================================================================== */
const QR = (() => {
  const ECC_LEN = { L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28] };
  const BLOCKS = { L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49] };
  const FORMAT = { L: 1, M: 0 };

  const rawModules = (v) => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) { const na = Math.floor(v / 7) + 2; r -= (25 * na - 10) * na - 55; if (v >= 7) r -= 36; }
    return r;
  };
  const dataCodewords = (v, e) => Math.floor(rawModules(v) / 8) - ECC_LEN[e][v] * BLOCKS[e][v];
  const gfMul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 0xff; };
  const rsDivisor = (deg) => {
    const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = gfMul(root, 2);
    }
    return r;
  };
  const rsRemainder = (data, div) => {
    const res = div.map(() => 0);
    for (const b of data) { const f = b ^ res.shift(); res.push(0); div.forEach((c, i) => { res[i] ^= gfMul(c, f); }); }
    return res;
  };
  const MASKS = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  function encode(text, ecl = 'M', forceMask = -1) {
    const bytes = new TextEncoder().encode(text);
    let ver = 1, cap = 0;
    for (; ver <= 40; ver++) { cap = dataCodewords(ver, ecl) * 8; if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= cap) break; }
    if (ver > 40) throw new Error('Text too long for a QR code');
    const bits = [];
    const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(4, 4); push(bytes.length, ver < 10 ? 8 : 16);
    for (const b of bytes) push(b, 8);
    push(0, Math.min(4, cap - bits.length));
    push(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) push(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }

    // Error correction + interleaving.
    const nb = BLOCKS[ecl][ver], el = ECC_LEN[ecl][ver], raw = Math.floor(rawModules(ver) / 8);
    const nShort = nb - (raw % nb), shortLen = Math.floor(raw / nb), div = rsDivisor(el);
    const blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const dat = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1));
      k += dat.length;
      const ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - el || j >= nShort) all.push(b[i]); });

    // Function patterns.
    const size = ver * 4 + 17;
    const mod = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, d) => { mod[y][x] = d; fn[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    if (ver > 1) {
      const na = Math.floor(ver / 7) + 2;
      const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
      const pos = [6];
      for (let p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
      pos.forEach((a, i) => pos.forEach((b, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }));
    }
    const drawFormat = (mask) => {
      const d = (FORMAT[ecl] << 3) | mask;
      let rem = d;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const b = ((d << 10) | rem) ^ 0x5412;
      const g = (i) => ((b >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) set(8, i, g(i));
      set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, g(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, g(i));
      set(8, size - 8, true);
    };
    drawFormat(0);
    if (ver >= 7) {
      let rem = ver;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const b = (ver << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const bit = ((b >>> i) & 1) !== 0, a = size - 11 + (i % 3), c = Math.floor(i / 3);
        set(a, c, bit); set(c, a, bit);
      }
    }
    // Data in the zig-zag order.
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
        if (!fn[y][x] && i < all.length * 8) { mod[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
      }
    }
    const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x]; };
    let mask = forceMask;
    if (mask < 0) {
      let best = Infinity;
      for (let m = 0; m < 8; m++) {
        applyMask(m); drawFormat(m);
        const p = penalty(mod, size);
        if (p < best) { best = p; mask = m; }
        applyMask(m);
      }
    }
    applyMask(mask); drawFormat(mask);
    return { version: ver, size, mask, modules: mod, get: (x, y) => mod[y][x] };
  }

  function penalty(m, n) {
    let p = 0, dark = 0;
    const lines = [];
    for (let y = 0; y < n; y++) lines.push(m[y]);
    for (let x = 0; x < n; x++) lines.push(m.map((row) => row[x]));
    const pat = [true, false, true, true, true, false, true];
    for (const L of lines) {
      let run = 1;
      for (let i = 1; i <= n; i++) {
        if (i < n && L[i] === L[i - 1]) run++;
        else { if (run >= 5) p += 3 + run - 5; run = 1; }
      }
      for (let i = 0; i + 7 <= n; i++) {
        if (!pat.every((v, k) => L[i + k] === v)) continue;
        const before = i >= 4 && [1, 2, 3, 4].every((k) => !L[i - k]);
        const after = i + 11 <= n && [7, 8, 9, 10].every((k) => !L[i + k]);
        if (before || after) p += 40;
      }
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (m[y][x]) dark++;
      if (x < n - 1 && y < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    }
    p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
    return p;
  }

  /** Small hash of the module grid (for the self-test against a reference encoder). */
  function checksum(text, mask = 2) {
    const q = encode(text, 'M', mask);
    let hsh = 0;
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) hsh = (Math.imul(hsh, 31) + (q.get(x, y) ? 1 : 0)) | 0;
    return hsh;
  }

  /** SVG markup with a 4-module quiet zone. */
  function svg(text, { dark = '#111', light = '#fff' } = {}) {
    const q = encode(text);
    const n = q.size + 8;
    let d = '';
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.get(x, y)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="QR code for the invite link"><rect width="${n}" height="${n}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
  }
  return { encode, svg, checksum };
})();
