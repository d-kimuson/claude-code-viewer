# Branch Naming Convention

## Format

```
{type}/{short-description}
```

## Prefixes

| Prefix      | Purpose                              |
| ----------- | ------------------------------------ |
| `feat/`     | New feature                          |
| `fix/`      | Bug fix                              |
| `chore/`    | Internal maintenance, config changes |
| `ci/`       | CI/CD changes                        |
| `docs/`     | Documentation changes                |
| `refactor/` | Code restructuring                   |
| `prepare/`  | Release preparation                  |

## Rules

- Use `-` (hyphen) to separate words within the description
- Use `/` to separate prefix from description

## Examples

### Good

```
feat/session-delete
feat/file-content-viewer
fix/mobile-right-panel-default
chore/update-dependencies
```

### Bad

```
my-branch                  # no type prefix
feat_new_feature           # underscore separator
FEAT/something             # uppercase prefix
```
