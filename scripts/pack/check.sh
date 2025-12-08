#!/usr/bin/env bash

set -ueo pipefail

./scripts/pack/pack.sh

npx_timeout_sec=10
if ! timeout "$npx_timeout_sec" ./temp-pack/claude-code-viewer; then
  status=$?
  # timeout(124) は起動確認完了として許容する
  if [ "$status" -ne 124 ]; then
    exit "$status"
  fi
fi
