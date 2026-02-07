#!/usr/bin/env bash

set -ueo pipefail

messages_file="src/lib/i18n/locales/en/messages.json"

if [ ! -f "$messages_file" ]; then
  echo "Error: missing $messages_file"
  exit 1
fi

matches=$(jq -r '
  to_entries[]
  | . as $entry
  | if ($entry.value | type) == "string" then
      select($entry.key == $entry.value)
      | $entry.key
    elif ($entry.value | type) == "object" and ($entry.value.translation | type) == "string" then
      select($entry.key == $entry.value.translation)
      | $entry.key
    else
      empty
    end
' "$messages_file")

if [ -n "$matches" ]; then
  echo "Error: key equals translation in $messages_file"
  echo ""
  echo "$matches"
  exit 1
fi

echo "✓ No key-equals-translation entries in $messages_file"
