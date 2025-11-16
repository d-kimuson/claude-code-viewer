---
description: '最新バージョンのCHANGELOGをリリースノート向けに整形'
allowed-tools: Read(*), Edit(CHANGELOG.md)
---

Review and refine the latest version section in CHANGELOG.md to make it suitable for a release announcement.

## Scope

Focus **only** on the most recent version section (the first version block in CHANGELOG.md).

## Principles

<user_facing_content>
### Keep User-Facing Changes Only
Include changes that matter to end users:
- New features and capabilities
- Bug fixes that affect user experience
- Performance improvements users will notice
- Breaking changes or deprecations

**Remove** internal/development changes:
- CI/CD configuration changes
- Internal refactoring
- Development tooling additions
- Dependency updates (unless they fix security issues or add user-visible features)
- Test improvements
- Documentation fixes
- Linting and formatting changes
</user_facing_content>

<writing_style>
### Release Note Writing Style
- Use clear, concise descriptions focused on user benefits
- Combine related commits into single, meaningful entries
- Remove redundant or overly technical details
- Ensure descriptions are self-explanatory without commit context
- Maintain consistent tone and formatting with previous releases
</writing_style>

## Workflow

1. **Read CHANGELOG.md**: Identify the latest version section
2. **Analyze each entry**: Determine if it's user-facing or internal
3. **Edit CHANGELOG.md**:
   - Remove internal/development entries
   - Refine remaining entries for clarity
   - Combine related changes where appropriate
4. **Report**: Summarize what was removed and why

## Error Handling

- If CHANGELOG.md doesn't exist, inform the user
- If the latest version has no entries, report this
- If all entries are internal changes, note that this might be a maintenance release
