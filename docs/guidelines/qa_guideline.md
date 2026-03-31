# QA Guideline

## Starting the Application

This project is a CLI tool that serves a web application.

```bash
# Production build
pnpm build && node dist/main.js

# Development (frontend + backend)
pnpm dev
```

**Note**: `pnpm dev` and `pnpm start` are prohibited for AI agents. When QA requires a running server, delegate to the user or a QA subagent.

## Exploratory Testing (CLI-based)

Use browser automation tools (e.g., `mcp__claude-in-chrome__*`) to interact with the running application.

### Flow

1. Confirm the development server is running (ask the user to start it if needed)
2. Navigate to the application in the browser
3. Exercise the UI flows related to the change
4. Verify normal-case user scenarios end-to-end

### What to Check

- Changed screens render correctly
- User interactions (click, input, navigation) behave as expected
- SSE-based real-time updates work (page reload re-establishes connection)
- No console errors or network failures in the browser

## Automated Tests

- Run related unit tests:
  ```bash
  pnpm exec vitest related --run {changed-files}
  ```
- Add tests for missing edge cases or error scenarios

## E2E Snapshot Tests

```bash
pnpm e2e
```

This starts the server and captures screenshots via Playwright for snapshot comparison.

## Tips

- **Mock data**: `mock-global-claude-dir/` contains test fixtures (useful schema examples)
- **Cache**: Stored in `~/.claude-code-viewer/`. Clear it if behavior seems stale
- **JSONL parsing**: When adding new schema entries, verify Zod validation passes
