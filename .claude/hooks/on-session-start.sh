#!/usr/bin/env bash

set -uo pipefail

HOOKS_DIR="$(dirname "$0")"
LOG_DIR="$HOOKS_DIR/logs"

mkdir -p "$LOG_DIR"

export LOG_FILE="$LOG_DIR/session-start.log"

source "$HOOKS_DIR/shared.sh"

# 前回セッションのログをクリーンアップ
find "$LOG_DIR" -type f -name "*.log" -delete 2>/dev/null || true

INPUT=$(cat)
SESSION_TYPE=$(echo "$INPUT" | jq -r '.session_type // empty')

log "SessionStart fired: session_type=$SESSION_TYPE"

# 失敗したステップを追跡
FAILURES=()

# Remote 環境用に direnv 解決できるようにしておく
export PATH="$HOME/.nix-profile/bin:/nix/var/nix/profiles/default/bin:$PATH"

if ! direnv_reload "$CLAUDE_PROJECT_DIR" "SessionStart"; then
  FAILURES+=("direnv reload")
  log "FAILED: direnv reload"
fi

if [ "$CLAUDE_CODE_REMOTE" == "true" ]; then
  log "setup remote env"

  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    {
      echo "export PATH=\"\$HOME/.nix-profile/bin:/nix/var/nix/profiles/default/bin:\$PATH\""
    } >> "$CLAUDE_ENV_FILE"
    log "wrote PATH to CLAUDE_ENV_FILE"
  fi

  log "pnpm install"
  if ! pnpm i --frozen-lockfile >> "$LOG_FILE" 2>&1; then
    FAILURES+=("pnpm install")
    log "FAILED: pnpm install"
  fi
fi

log "SessionStart hook completed"

# additionalContext を成否に応じて構築
if [ ${#FAILURES[@]} -eq 0 ]; then
  CONTEXT="Environment setup completed successfully."
else
  FAILED_LIST=$(IFS=', '; echo "${FAILURES[*]}")
  CONTEXT="Session startup setup failed for: ${FAILED_LIST}. This may cause unexpected issues with command execution. To troubleshoot, check .claude/hooks/logs/session-start.log."
fi

jq -n --arg ctx "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart"
  },
  suppressOutput: true,
  additionalContext: $ctx
}'
