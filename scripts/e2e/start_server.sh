#!/usr/bin/env bash

set -euo pipefail

export PORT=4000
export GLOBAL_CLAUDE_DIR=$(git rev-parse --show-toplevel)/mock-global-claude-dir

echo "Check directory structure in $GLOBAL_CLAUDE_DIR:"
ls -l $GLOBAL_CLAUDE_DIR

node ./dist/main.js
