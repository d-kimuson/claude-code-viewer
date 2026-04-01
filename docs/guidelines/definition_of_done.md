# Definition of Done

Before committing, ensure all acceptance criteria are met and the gate check passes:

```bash
pnpm gatecheck check
```

This runs all of the following checks against changed files:

- **oxfmt**: Code formatting (oxfmt)
- **oxlint**: Linting (oxlint)
- **typecheck**: TypeScript type checking (`tsc --noEmit`)
- **typecheck-tsgo**: TypeScript type checking (`tsgo --noEmit`)
- **vitest**: Unit tests related to changed files
