#!/usr/bin/env bash
# FileChanged hook: .envrc が変更されたら direnv reload
set -euo pipefail

HOOKS_DIR="$(dirname "$0")"
LOG_DIR="$HOOKS_DIR/logs"

export LOG_FILE="$LOG_DIR/file-changed.log"

source "$HOOKS_DIR/shared.sh"

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // empty')
EVENT=$(echo "$INPUT" | jq -r '.event // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

log "FileChanged fired: file=$FILE_PATH event=$EVENT cwd=$CWD"

direnv_reload "$CWD" "FileChanged"

log "FileChanged hook completed"
