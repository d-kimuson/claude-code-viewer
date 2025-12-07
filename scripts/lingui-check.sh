#!/usr/bin/env bash

set -ueo pipefail

# lingui:extract を実行して Missing をチェック
output=$(pnpm lingui:extract 2>&1)

# Missing の値を抽出
missing_values=$(echo "$output" | grep -A 100 "Catalog statistics" | grep -E "│.*│.*│.*│" | grep -v "Language" | grep -v "─" | awk -F'│' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); if ($4 != "-" && $4 != "") print $4}')

# Missing が 0 より大きい値があるかチェック
has_missing=false
for value in $missing_values; do
  if [ "$value" -gt 0 ]; then
    echo "Error: Missing translations found: $value"
    has_missing=true
  fi
done

if [ "$has_missing" = true ]; then
  echo ""
  echo "$output"
  exit 1
fi

echo "✓ All translations are complete (no missing translations)"

