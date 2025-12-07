---
description: '不足しているi18n翻訳を補完してコンパイル'
allowed-tools: Bash(pnpm), Read(*), Edit(*.json), Grep
---

Generate missing i18n translations for Japanese and Simplified Chinese locales, then compile and verify catalogs.

<workflow>
## 1. Extract and Identify Missing Translations

Run `pnpm lingui:extract` to update catalogs and identify missing entries.

For each locale (ja, zh_CN), identify all keys with empty translations by comparing against the English source.

## 2. Generate Translations

For each missing translation:
- **Japanese (ja)**: Translate to natural Japanese
- **Simplified Chinese (zh_CN)**: Translate to Simplified Chinese (简体中文)

**Guidelines**:
- Keep technical terminology in English (e.g., "API", "TypeScript", "React")
- Example: "API documentation" → Japanese: "APIドキュメント"

## 3. Update Translation Files

Edit `src/lib/i18n/locales/{locale}/messages.json` to replace empty `"translation": ""` with generated content.

## 4. Compile and Verify

1. Run `pnpm lingui:compile` to compile catalogs
2. Run `scripts/lingui-check.sh` to verify completion
3. Report summary of translations added
</workflow>

<constraints>
- Never modify the English source locale (en/messages.json)
- Do not translate placeholder syntax: `{variable}`, `{count, plural, one {...} other {...}}`, etc.
- Keep translations contextually appropriate based on origin file paths
</constraints>

<error_handling>
- If lingui:compile fails: Check JSON syntax with `pnpm fix`
- If verification fails: Re-check all empty translations were replaced, verify key names match across locales
</error_handling>
