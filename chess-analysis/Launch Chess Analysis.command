#!/bin/bash
# Double-click this file in Finder to start Chess Analysis.
# It starts a small local web server (needed for the Stockfish 19 engine)
# and opens the app in your default browser. Close this window to stop it.
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1 && python3 -c 'import http.server' >/dev/null 2>&1; then
  exec python3 serve.py "$@"
fi
if command -v perl >/dev/null 2>&1; then
  echo "python3 not available; using the Perl fallback server."
  exec perl serve.pl "$@"
fi
echo "Neither python3 nor perl was found."
echo "Install Apple's Command Line Tools with:  xcode-select --install"
read -r -p "Press Return to close." _
