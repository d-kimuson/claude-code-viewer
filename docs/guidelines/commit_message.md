# Commit Message Convention

## Format

Conventional Commits: `type: description`

- Scope is **not used** (e.g., `feat(api):` is not the convention here)
- Description starts with **lowercase**
- Written in **English**, imperative mood (present tense)
- No issue number references in messages

## Type Selection

| Type | Release Note Section | When to Use |
|------|---------------------|-------------|
| `feat` | Features | User-facing new feature |
| `fix` | Bug Fixes | User-impacting bug fix |
| `chore` | Excluded | Internal changes, dependency updates, config, lingui messages |
| `ci` | Excluded | CI/CD changes |
| `build` | Excluded | Build system changes |
| `refactor` | Excluded | Code restructuring without behavior change |

**Important**: Commit messages appear in release notes. Use `fix` only for user-facing bugs. Internal fixes (linter errors, type errors, build config) use `chore`.

## Examples

### Good

```
feat: add dark mode toggle to settings
feat: add PWA support for installable app experience
feat: add --api-only flag for headless API server mode
fix: session list not updating after deletion
fix: right panel opening by default on mobile devices
chore: update lingui compiled messages
chore: address CodeRabbit review feedback
```

### Bad

```
fix: fix lingui error          # internal issue, should be chore
feat: add button               # too vague, describe what it enables
Fix: session bug               # uppercase, past tense
feat(ui): add modal            # scope not used in this project
```
