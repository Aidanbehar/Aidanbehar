/* Inlines the stylesheet and every script into one self-contained .html file
   that runs straight from the filesystem -- no server, no build step, no
   modules, so a double-click in any browser works. */
var fs = require('fs'), path = require('path');
var root = __dirname;
var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, function (_, href) {
  return '<style>\n' + fs.readFileSync(path.join(root, href), 'utf8') + '\n</style>';
});
html = html.replace(/<script src="([^"]+)"><\/script>/g, function (_, src) {
  var code = fs.readFileSync(path.join(root, src), 'utf8');
  // guard against a stray </script> inside a string literal closing the tag
  code = code.replace(/<\/script>/gi, '<\\/script>');
  return '<script>\n' + code + '\n</script>';
});

var outDir = path.join(root, 'dist');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
var out = path.join(outDir, 'alpine-descent.html');
fs.writeFileSync(out, html);
console.log('built ' + out + '  (' + (Buffer.byteLength(html)/1048576).toFixed(2) + ' MB)');
