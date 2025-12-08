#!/usr/bin/env bash

set -ueo pipefail

temp_dir="e2e-check-temp"
temp_cache_dir="npm-cache" # 空のキャッシュディレクトリを使うことでクリーンインストール時の動作を再現

if [ -d "$temp_dir" ]; then
  rm -rf "$temp_dir"
fi

pnpm build
output_file=$(pnpm pack --pack-destination ./$temp_dir --json 2>&1 | sed -n '/^{/,$p' | jq -r '.filename')

npx_timeout_sec=10
if ! timeout "$npx_timeout_sec" npx --yes --cache "./$temp_dir/$temp_cache_dir" --package "$output_file" claude-code-viewer; then
  status=$?
  # timeout(124) は起動確認完了として許容する
  if [ "$status" -ne 124 ]; then
    exit "$status"
  fi
fi

rm -rf $temp_dir
