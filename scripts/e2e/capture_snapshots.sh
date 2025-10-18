#!/usr/bin/env bash

set -euo pipefail

export GLOBAL_CLAUDE_DIR=$(git rev-parse --show-toplevel)/mock-global-claude-dir

pnpx tsx ./e2e/captureSnapshot/index.ts
