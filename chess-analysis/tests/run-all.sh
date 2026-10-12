#!/usr/bin/env bash
# Runs every automated test suite and writes the output to tests/results/.
#   tests/run-all.sh            (all suites)
#   SKIP_E2E=1 tests/run-all.sh (skip the Chromium end-to-end suite)
# Requirements: Node.js 20+; for the e2e suite, Playwright with Chromium and python3.
set -u
cd "$(dirname "$0")/.."
mkdir -p tests/results
status=0
run() {
  local name=$1; shift
  echo "== $name"
  if node --test --test-reporter=spec --test-concurrency=1 "$@" > "tests/results/$name.txt" 2>&1; then
    echo "   PASS  ($(grep -E '^ℹ pass' "tests/results/$name.txt" | awk '{print $3}') passed)"
  else
    status=1
    echo "   FAIL  (see tests/results/$name.txt)"
    grep -E '^ℹ (pass|fail)' "tests/results/$name.txt" | sed 's/^/   /'
  fi
}
run core tests/core.test.mjs
run engine tests/engine.test.mjs
run lessons tests/lessons.test.mjs
if [ "${SKIP_E2E:-0}" != "1" ]; then run e2e tests/e2e.test.mjs; fi
exit $status
