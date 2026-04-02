#!/usr/bin/env bash

set -euo pipefail

HOOKS_DIR="$(dirname "$0")"
LOG_DIR="$HOOKS_DIR/logs"

export LOG_FILE="$LOG_DIR/cwd-changed.log"

source "$HOOKS_DIR/shared.sh"

INPUT=$(cat)
NEW_CWD=$(echo "$INPUT" | jq -r '.new_cwd // .cwd // empty')
OLD_CWD=$(echo "$INPUT" | jq -r '.old_cwd // empty')

log "CwdChanged fired: old=$OLD_CWD new=$NEW_CWD"

direnv_reload "$NEW_CWD" "CwdChanged"

log "CwdChanged hook completed"
