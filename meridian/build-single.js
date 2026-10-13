#!/usr/bin/env node
// Builds meridian.html: one self-contained file with the stylesheet, all scripts and the map data inlined.
// Usage: node build-single.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
// Keep "</script" inside inlined code from closing the tag early.
const safe = (code) => code.replace(/<\/(script)/gi, '<\\/$1');
const LAZY = ['data/timezones-map.js', 'data/countries-map.js', 'tests/tests.js'];

let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="css/app.css">', () => `<style>\n${read('css/app.css')}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>/* ${src} */\n${safe(read(src))}\n</script>`);
const lazy = `<script>\nwindow.MERIDIAN_BUNDLED = {};\n${LAZY.map(f => `window.MERIDIAN_BUNDLED[${JSON.stringify(f)}] = function () {\n${safe(read(f))}\n};`).join('\n')}\n</script>\n`;
html = html.replace('<script>/* js/vendor/d3.min.js */', () => lazy + '<script>/* js/vendor/d3.min.js */');
if (/<script src=|href="css\//.test(html)) throw new Error('Unresolved external reference left in output');
fs.writeFileSync(path.join(dir, 'meridian.html'), html);
console.log(`Wrote meridian.html (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
