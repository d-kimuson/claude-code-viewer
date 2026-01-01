#!/usr/bin/env bash

set -euo pipefail

claude_dir="$(git rev-parse --show-toplevel)/mock-global-claude-dir"

echo "Check directory structure in $claude_dir:"
ls -l $claude_dir

node ./dist/main.js --port 4000 --claude-dir $claude_dir
