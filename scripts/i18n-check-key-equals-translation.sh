#!/usr/bin/env bash

set -ueo pipefail

locales_dir="src/lib/i18n/locales"

if [ ! -d "$locales_dir" ]; then
  echo "Error: missing $locales_dir"
  exit 1
fi

has_errors=false

for messages_file in "$locales_dir"/*/messages.json; do
  if [ ! -f "$messages_file" ]; then
    continue
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
    if [ "$has_errors" = false ]; then
      echo "Error: key equals translation entries found"
      echo ""
      has_errors=true
    fi
    echo "$messages_file"
    echo "$matches"
    echo ""
  fi
done

if [ "$has_errors" = true ]; then
  exit 1
fi

echo "✓ No key-equals-translation entries in $locales_dir"
