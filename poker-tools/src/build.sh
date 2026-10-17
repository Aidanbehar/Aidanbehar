#!/bin/sh
D=$(dirname "$0")/parts
OUT=$(dirname "$0")/../../poker/index.html
cat $D/0_head.html $D/a_engine.js $D/a2_fair.js $D/a3_bots.js $D/a4_sra.js $D/b_notation.js $D/sample.js $D/d_qr.js $D/e_host.js $D/f_net.js $D/g_ui.js $D/c_tests.js $D/k_cepheus.js $D/h_screens.js $D/j_learn.js $D/i_viewer.js > $OUT.tmp
printf '</script>\n</body>\n</html>\n' >> $OUT.tmp
# Content-Security-Policy: only our own two inline scripts (pinned by hash) and the two CDNs may run code.
python3 - "$OUT.tmp" <<'PY'
import sys, re, hashlib, base64
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
# Play Against Cepheus: pin the separately loaded engine (SRI) and strategy (SHA-256) to this build.
import os
cdir = os.path.join(os.path.dirname(p), 'cepheus')
js, binf = os.path.join(cdir, 'cepheus.js'), os.path.join(cdir, 'cepheus-strategy.bin')
if os.path.exists(js) and os.path.exists(binf):
    jb, bb = open(js, 'rb').read(), open(binf, 'rb').read()
    s = s.replace('__CEPHEUS_JS_SRI__', 'sha384-' + base64.b64encode(hashlib.sha384(jb).digest()).decode())
    s = s.replace('__CEPHEUS_BIN_SHA256__', hashlib.sha256(bb).hexdigest()).replace('__CEPHEUS_BIN_BYTES__', str(len(bb)))
    sf = os.path.join(cdir, 'cepheus-stats.json')
    if os.path.exists(sf): s = s.replace('__CEPHEUS_STATS_SHA__', hashlib.sha256(open(sf, 'rb').read()).hexdigest())
else:
    print('warning: cepheus files missing; Play Against Cepheus will show an error', file=sys.stderr)
hashes = []
for m in re.finditer(r'<script>(.*?)</script>', s, re.S):
    hashes.append("'sha256-" + base64.b64encode(hashlib.sha256(m.group(1).encode('utf-8')).digest()).decode() + "'")
csp = ("default-src 'none'; "
       "script-src 'self' " + ' '.join(hashes) + " https://unpkg.com/peerjs@1.5.4/ https://cdn.jsdelivr.net/npm/peerjs@1.5.4/; "
       "style-src 'unsafe-inline'; img-src 'self' data: blob:; "
       "connect-src 'self' https://0.peerjs.com wss://0.peerjs.com; "
       "base-uri 'none'; form-action 'none'; object-src 'none'")
s = s.replace('__CSP__', csp)
open(p, 'w', encoding='utf-8').write(s)
PY
mv $OUT.tmp $OUT
wc -c $OUT
