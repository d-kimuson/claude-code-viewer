#!/usr/bin/env bash

set -euo pipefail

export PORT=4000
export GLOBAL_CLAUDE_DIR=$(git rev-parse --show-toplevel)/mock-global-claude-dir

echo "Check directory structure in $GLOBAL_CLAUDE_DIR:"
ls -l $GLOBAL_CLAUDE_DIR

kill_process_group() {
  local pid=$1
  local sig=${2:-TERM}
  
  local children=$(pgrep -P $pid 2>/dev/null || true)
  for child in $children; do
    kill_process_group $child $sig
  done
  
  kill -$sig $pid 2>/dev/null || true
}

# cleanup関数を定義してtrapで確実に実行
cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    echo "Killing server (PID: $SERVER_PID) and its process tree..."
    kill_process_group $SERVER_PID KILL
  fi
}

trap cleanup EXIT INT TERM

pnpm start & SERVER_PID=$!
echo "Server started. pid=$SERVER_PID"

sleep 5 # 即時起動するが、一応少し待っておく

pnpx tsx ./e2e/captureSnapshot/index.ts
echo "Completed capturing screenshots. Killing server..."
