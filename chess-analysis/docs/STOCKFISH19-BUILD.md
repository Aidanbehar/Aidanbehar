# Stockfish 19: source, build method and provenance

The engine in `engine/stockfish-19/` is the **official Stockfish 19**, compiled from source to WebAssembly. No other engine and no other Stockfish version is used anywhere in the app.

## Source

| Item | Value |
|---|---|
| Repository | https://github.com/official-stockfish/Stockfish |
| Tag | `sf_19` |
| Commit | `edb0d9db6731067ec50ce619ff372b463bc4dd5d` ("Stockfish 19", 2026-09-05) |
| Version check | `src/misc.cpp` contains `constexpr std::string_view version = "19";` and the binary answers `id name Stockfish 19` |
| Bench signature | `2497913` (from the release commit message); reproduced by the unmodified wasm build under Node with the official `tests/signature.sh` |
| NNUE network | `nn-1a298aa575a0.nnue` (98,511,183 bytes), the `EvalFileDefaultName` of `sf_19`, fetched by the official `make net` from `tests.stockfishchess.org` |
| Network SHA-256 | `1a298aa575a085434d29027978dc36867fe9c5bcea9376654b7a8eba1e52dfc2` (its first 12 hex digits are the file name, as Stockfish requires) |
| Licence | GPL-3.0 (`engine/stockfish-19/COPYING-Stockfish.txt`) |

## Toolchain

- Emscripten **6.0.12** (`emsdk install latest` on 2026-10-11).
- The **official Stockfish Makefile**, which has `ARCH=wasm32` and `ARCH=wasm32-relaxed-simd` targets. These are the targets Stockfish's own CI uses (`.github/workflows/wasm_compilation.yml`).

## Verifying the toolchain first

Before making any change, the unmodified source was built exactly as Stockfish's CI does it:

```
COMPCXX=em++ make -j build ARCH=wasm32-relaxed-simd EXTRALDFLAGS="--preload-file nn-1a298aa575a0.nnue"
EXE=./stockfish.js RUN_PREFIX=node ../tests/signature.sh 2497913   # -> "signature OK: 2497913"
```

## The single source change (browser input)

A browser has no blocking `stdin`, so Stockfish's UCI loop (`std::getline(std::cin, …)`) cannot receive commands there. `build/sf19-browser-stdin.patch` (40 added lines, all in `src/uci.cpp`, all behind `#ifdef SF_BROWSER_STDIN`) does two things:

- It replaces `getline(std::cin, cmd)` with a mutex/condition-variable queue.
- It adds an exported C function, `sf_uci_push(const char*)`, that JavaScript calls to enqueue one command.

Search, evaluation, NNUE, move generation and every UCI command are untouched. When `SF_BROWSER_STDIN` is not defined, the source compiles to the original code.

## Link flags

On top of the Makefile's own wasm flags (`-pthread -msimd128 -DNNUE_EMBEDDING_OFF -DUSE_POPCNT …`), the build adds:

```
-DSF_BROWSER_STDIN
-sPROXY_TO_PTHREAD -sMODULARIZE=1 -sEXPORT_NAME=Stockfish19
-sEXPORTED_FUNCTIONS=_main,_sf_uci_push -sEXPORTED_RUNTIME_METHODS=ccall,FS
-sENVIRONMENT=web,worker,node -sINITIAL_MEMORY=256MB -sMAXIMUM_MEMORY=4GB
-sFORCE_FILESYSTEM=1 -sEXIT_RUNTIME=1
```

`PROXY_TO_PTHREAD` runs `main()` and the UCI loop on their own thread, so the hosting Web Worker never blocks. The search uses Stockfish's normal thread pool, which means the `Threads` option works.

## Reproducing the build

```
git clone https://github.com/emscripten-core/emsdk && cd emsdk
./emsdk install latest && ./emsdk activate latest && source ./emsdk_env.sh
cd /path/to/chess-analysis
build/build-stockfish.sh            # clones sf_19, checks commit and version, applies the patch,
                                    # runs `make net`, builds both targets, splits the net
```

The script refuses to build if the checked-out commit is not `edb0d9d…` or if the version string is not `19`.

## Shipped files

| File | Purpose | SHA-256 |
|---|---|---|
| `stockfish-19.js` | Emscripten loader (SIMD build) | `7c6f9870e1af37118d057614d73a9e3e7a1782a614ab5c6c917e329af859f150` |
| `stockfish-19.wasm` | Engine, WebAssembly SIMD128 | `ea5b1306edc31fabbb00945fa0433c7bc81fec74c8ebb55277a9907d1c80eaad` |
| `stockfish-19-relaxed.js` | Loader (relaxed-SIMD build) | `a2ddd0ea367ae9df0d3b3eb0d91b1371e799cf07f751bf7069343bfef858a20f` |
| `stockfish-19-relaxed.wasm` | Engine, relaxed SIMD (faster where supported) | `d58a5950a3415bddaccb2db535557e5d4954f5d39dc98a91ab28b48c8782be64` |
| `nn-1a298aa575a0.nnue.part0/1` | The NNUE network, split into two files under 50 MB so it fits in a normal git repository | see `nnue.sha256` (whole file) |
| `nnue-parts.txt`, `nnue.sha256` | Manifest and checksum | — |

`engine/engine-worker.js` picks the relaxed-SIMD build when `WebAssembly.validate` accepts a relaxed-SIMD probe, and the plain SIMD build otherwise. It then:

1. downloads both network parts from the local server;
2. checks the joined file's **SHA-256** before use;
3. writes it into the engine's in-memory file system, where Stockfish loads it through its normal `EvalFile` mechanism.

## Why a local server is required

The threaded WebAssembly build needs `SharedArrayBuffer`, which browsers enable only on *cross-origin isolated* pages. That requires the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` HTTP headers, and a `file://` page cannot have them. Browsers also refuse to start module workers from `file://`.

So the app is served by `serve.py` (or the fallback `serve.pl`), which sends these headers and listens only on 127.0.0.1. A single self-contained HTML file was therefore not practical without giving up the real engine.
