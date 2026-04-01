#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_DIR="${1:-/tmp/security-check-$$}"

mkdir -p "${OUTPUT_DIR}"

echo "=== Security Check ===" >&2
echo "Output: ${OUTPUT_DIR}" >&2

# pnpm audit
echo "" >&2
echo "--- [1/2] pnpm audit ---" >&2
cd "${PROJECT_ROOT}"
pnpm audit --json > "${OUTPUT_DIR}/pnpm-audit.json" 2>&1 || true
echo "Done." >&2

# CodeQL
echo "" >&2
echo "--- [2/2] CodeQL ---" >&2
CODEQL_DB="${OUTPUT_DIR}/codeql-db"
CODEQL_SARIF="${OUTPUT_DIR}/codeql.sarif"
CODEQL_LOG="${OUTPUT_DIR}/codeql.log"

codeql database create "${CODEQL_DB}" \
  --language=javascript-typescript \
  --source-root="${PROJECT_ROOT}" \
  --overwrite \
  > "${CODEQL_LOG}" 2>&1

codeql database analyze "${CODEQL_DB}" \
  --format=sarif-latest \
  --output="${CODEQL_SARIF}" \
  codeql/javascript-queries:codeql-suites/javascript-security-and-quality.qls \
  >> "${CODEQL_LOG}" 2>&1

echo "Done." >&2

echo "" >&2
echo "=== Results ===" >&2
echo "pnpm audit : ${OUTPUT_DIR}/pnpm-audit.json" >&2
echo "CodeQL     : ${OUTPUT_DIR}/codeql.sarif" >&2
echo "" >&2

# Print output dir path to stdout for scripting
echo "${OUTPUT_DIR}"
