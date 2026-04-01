---
description: "コードベース全体のセキュリティ監査を実行し、日本語でレポートを作成"
disable-model-invocation: true
user-invocable: true
allowed-tools: Bash(nix, date, mkdir), Read, Grep, Glob, Write
---

You are a security expert. Conduct a comprehensive security audit of this project in three phases, then produce a report in Japanese.

## Phase 1: Launch Automated Security Check

Run the security check script (this takes time):

```bash
nix develop --command bash -c "./scripts/security-check.sh"
```

Note the output directory path from stdout. Proceed to Phase 2 while waiting is not possible since this is synchronous — once it completes, move on.

## Phase 2: Manual Codebase Inspection

Independently inspect the codebase as a security expert. Use Grep, Glob, and Read to examine code. Document each finding with exact file path, line number, severity, and recommended fix.

**Areas to investigate**:

**Injection & Input Validation**

- Command injection in `Bash`/`Command` usage — check `src/server/` for unsanitized user input passed to shell commands
- Path traversal in JSONL file reads — verify paths are constrained to `~/.claude/projects/`
- XSS in React components — search for `dangerouslySetInnerHTML`, unsanitized content rendering

**Secrets & Sensitive Data**

- Hardcoded credentials, API keys, tokens in source files
- Sensitive data leaking into logs or error messages exposed via SSE/API

**Server-side (Hono routes)**

- Input validation on all route handlers in `src/server/hono/route.ts`
- File path inputs that could escape intended directories
- Error responses that reveal internal paths or stack traces

**Dependency & Supply Chain**

- Suspicious or unnecessary packages in `package.json`
- Scripts in `package.json` / `pnpm-lock.yaml` that execute on install

**Frontend**

- Raw `fetch` bypassing TanStack Query (policy violation that could indicate auth bypass)
- Eval-like patterns (`eval`, `Function()`, `innerHTML`)

## Phase 3: Integrate Findings and Write Report

Read the script output files from the directory captured in Phase 1:

- `pnpm-audit.json` — parse `vulnerabilities` object (severity, via, fixAvailable) and `metadata.vulnerabilities` counts
- `codeql.sarif` — parse `runs[0].results[]` (ruleId, message.text, physicalLocation uri+startLine, level)

**Exclude false positives**:

- `uri` starting with `dist/` (build artifacts)
- `ruleId = "js/insecure-temporary-file"` in `*.test.ts` / `*.test.tsx`

Annotate excluded items with reason.

Get today's date with `date +%Y-%m-%d`, create `docs/tmp/` if needed, and write to `docs/tmp/security-report-{date}.md`.

**Write the entire report in Japanese** using this structure:

```markdown
# セキュリティ監査レポート {date}

## サマリー

| 重要度   | 件数 |
| -------- | ---- |
| Critical | ...  |
| High     | ...  |
| Medium   | ...  |
| Low      | ...  |

## アクションが必要な指摘事項

### [重要度] 指摘タイトル

- **場所**: `ファイルパス:行番号`（またはパッケージ名とバージョン）
- **説明**: 問題の内容と攻撃シナリオ
- **評価**: このプロジェクトのコンテキスト（ローカル単一ユーザーツール）での悪用可能性
- **推奨対応**: 具体的な修正方法
- **検知元**: 手動調査 / CodeQL / pnpm audit（複数可）

## 除外した偽陽性

| 指摘 | 場所 | 除外理由 |
| ---- | ---- | -------- |
```
