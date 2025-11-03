#!/usr/bin/env bash
set -euo pipefail

CLAUDE_HOME="${HOME}/.claude"

# Make sure `~/.claude/projects` folder exists.
mkdir -p "$CLAUDE_HOME/projects"

# Only bootstrap when Claude home is backed by an external volume.
if ! mountpoint -q "$CLAUDE_HOME" && [ ! -f "$CLAUDE_HOME/settings.json" ]; then
  cat <<EOF > "$CLAUDE_HOME/settings.json"
{
  "env": {
    "ANTHROPIC_BASE_URL": "${ANTHROPIC_BASE_URL:-}",
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY:-}",
    "ANTHROPIC_AUTH_TOKEN": "${ANTHROPIC_AUTH_TOKEN:-}"
  }
}
EOF
fi

exec "$@"
