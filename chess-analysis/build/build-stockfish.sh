#!/usr/bin/env bash
# Reproducible WebAssembly build of the official Stockfish 19 release.
#
#   Source : https://github.com/official-stockfish/Stockfish  tag sf_19
#            commit edb0d9db6731067ec50ce619ff372b463bc4dd5d
#   Net    : nn-1a298aa575a0.nnue (the EvalFileDefaultName of sf_19,
#            fetched and SHA-256 checked by the official `make net`)
#   Build  : the official Makefile wasm32 targets (as used by Stockfish's own
#            .github/workflows/wasm_compilation.yml) + one small patch
#            (sf19-browser-stdin.patch) that lets the UCI loop read commands
#            from a JavaScript queue instead of a blocking stdin.
#
# Requirements: git, make, curl or wget, an activated emsdk (em++ on PATH).
#   git clone https://github.com/emscripten-core/emsdk && cd emsdk
#   ./emsdk install latest && ./emsdk activate latest && source ./emsdk_env.sh
#
# Usage: build/build-stockfish.sh [workdir]
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$(cd "$HERE/.." && pwd)"
WORK="${1:-$APP/build/work}"
TAG=sf_19
COMMIT=edb0d9db6731067ec50ce619ff372b463bc4dd5d
OUT="$APP/engine/stockfish-19"

command -v em++ >/dev/null || { echo "em++ not found: activate emsdk first" >&2; exit 1; }

mkdir -p "$WORK"
if [ ! -d "$WORK/Stockfish" ]; then
  git clone --depth 1 --branch "$TAG" https://github.com/official-stockfish/Stockfish "$WORK/Stockfish"
fi
cd "$WORK/Stockfish"
actual="$(git rev-parse HEAD)"
[ "$actual" = "$COMMIT" ] || { echo "Unexpected commit $actual (wanted $COMMIT)" >&2; exit 1; }
grep -q 'constexpr std::string_view version = "19";' src/misc.cpp || { echo "Source is not Stockfish 19" >&2; exit 1; }

git checkout -- src/uci.cpp
git apply "$HERE/sf19-browser-stdin.patch"

cd src
make net
NET="$(grep -oE 'nn-[0-9a-f]+\.nnue' evaluate.h | head -1)"

LDF="-sPROXY_TO_PTHREAD -sMODULARIZE=1 -sEXPORT_NAME=Stockfish19 \
 -sEXPORTED_FUNCTIONS=_main,_sf_uci_push -sEXPORTED_RUNTIME_METHODS=ccall,FS \
 -sENVIRONMENT=web,worker,node -sMAXIMUM_MEMORY=4GB -sINITIAL_MEMORY=256MB \
 -sFORCE_FILESYSTEM=1 -sEXIT_RUNTIME=1"

mkdir -p "$OUT"
for ARCH in wasm32 wasm32-relaxed-simd; do
  make clean >/dev/null
  COMPCXX=em++ make -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)" build ARCH="$ARCH" \
    EXTRACXXFLAGS="-DSF_BROWSER_STDIN" EXTRALDFLAGS="$LDF"
  suffix=""; [ "$ARCH" = "wasm32-relaxed-simd" ] && suffix="-relaxed"
  # Rename outputs; the loader references the .wasm by name.
  sed "s/stockfish\.wasm/stockfish-19${suffix}.wasm/g" stockfish.js > "$OUT/stockfish-19${suffix}.js"
  cp stockfish.wasm "$OUT/stockfish-19${suffix}.wasm"
done

# The 98.5 MB net is split into two parts (< 50 MB each) so it can live in a
# normal git repository; engine-worker.js concatenates them and re-checks the hash.
rm -f "$OUT"/nn-*.part*
split -b 50000000 -d -a 1 "$NET" "$OUT/$NET.part"
( cd "$OUT" && ls -1 "$NET".part* > nnue-parts.txt )
SHA="$( (command -v sha256sum >/dev/null && sha256sum "$NET") || shasum -a 256 "$NET")"
echo "${SHA%% *}  $NET" > "$OUT/nnue.sha256"
cp ../Copying.txt "$OUT/COPYING-Stockfish.txt"
cp "$HERE/sf19-browser-stdin.patch" "$OUT/"
echo "Built into $OUT"
ls -la "$OUT"
