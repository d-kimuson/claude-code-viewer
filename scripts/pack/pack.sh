#!/usr/bin/env bash

set -ueo pipefail

temp_dir="temp-pack"
temp_cache_dir="${temp_dir}/npm-cache" # 空のキャッシュディレクトリを使うことでクリーンインストール時の動作を再現
temp_bin_file="${temp_dir}/claude-code-viewer"

if [ -d "$temp_dir" ]; then
  rm -rf "$temp_dir"
fi

pnpm build
output_file=$(pnpm pack --pack-destination ./$temp_dir --json 2>&1 | sed -n '/^{/,$p' | jq -r '.filename')

echo "#!/usr/bin/env bash" >> $temp_bin_file
echo "" >> $temp_bin_file
echo "if [ -d \"$temp_cache_dir\" ]; then" >> $temp_bin_file
echo "  rm -rf $temp_cache_dir" >> $temp_bin_file
echo "fi" >> $temp_bin_file
echo "npx --yes --cache \"./$temp_cache_dir\" --package \"$output_file\" claude-code-viewer \$@" >> $temp_bin_file
echo "" >> $temp_bin_file

chmod +x $temp_bin_file
