---
name: i18n
description: "Use when updating Lingui catalogs or fixing translations"
disable-model-invocation: false
user-invocable: true
---

## Core rules
- English (`en`) is the source catalog. Do not alter keys; only update translations.
- Preserve placeholders and ICU syntax exactly (e.g., `{name}`, `{count, plural, one {...} other {...}}`).
- Keep technical terms in English when appropriate (API, TypeScript, React).

## Translation updates
- Update `src/lib/i18n/locales/{locale}/messages.json` only; do not edit compiled outputs by hand.
- Use `./scripts/put-transtation.js` to safely update a specific entry without loading the full file into context.

## Verification
- Run `pnpm lingui:extract` when new messages are added.
- Run `pnpm lingui:compile` to regenerate compiled catalogs.
- Run `scripts/lingui-check.sh` to verify no missing translations.
- Run `scripts/i18n-check-key-equals-translation.sh` to ensure key != translation in all locales.
