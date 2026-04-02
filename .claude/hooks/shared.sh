#!/usr/bin/env bash

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "${LOG_FILE}"; }

direnv_reload() {
  local target_dir="$1"
  local log_prefix="$2"

  # .envrc がなければ何もしない
  if [ ! -f "$target_dir/.envrc" ]; then
    log "$log_prefix: no .envrc in $target_dir, skipping"
    return 0
  fi

  if [ -z "${CLAUDE_ENV_FILE:-}" ]; then
    log "$log_prefix: ERROR: CLAUDE_ENV_FILE is not set"
    return 1
  fi

  log "$log_prefix: CLAUDE_ENV_FILE=$CLAUDE_ENV_FILE"

  cd "$target_dir"
  direnv allow . >> "$LOG_FILE" 2>&1
  local direnv_json
  direnv_json=$(direnv export json 2>>"$LOG_FILE") || true

  if [ -n "$direnv_json" ]; then
    local env_lines
    env_lines=$(echo "$direnv_json" | jq -r '
      to_entries
      | map(select(.value != null and (.key | startswith("DIRENV_") | not)))
      | map("export " + .key + "=\u0027" + (.value | gsub("\u0027"; "\u0027\\\u0027\u0027")) + "\u0027")
      | .[]
    ' || true)

    local count
    count=$(echo "$env_lines" | grep -c . || true)
    log "$log_prefix: env vars count: $count"

    if [ -n "$env_lines" ]; then
      echo "$env_lines" > "$CLAUDE_ENV_FILE"
      log "$log_prefix: wrote to $CLAUDE_ENV_FILE"
    else
      log "$log_prefix: no relevant env changes, clearing"
      > "$CLAUDE_ENV_FILE"
    fi
  else
    log "$log_prefix: no direnv output, clearing"
    > "$CLAUDE_ENV_FILE"
  fi

  echo "direnv-reload ($log_prefix): updated ${CLAUDE_ENV_FILE}" >&2
}
