# CLAUDE.md

## Critical Rules (Read First)

**Communication**:
- Always communicate with users in Japanese (日本語)
- Code, comments, and commit messages should be in English
- This document is in English for context efficiency

**NEVER**:
- Use `as` type casting in ANY context including test code (explain the problem to the user instead)
- Use raw `fetch` or bypass TanStack Query for API calls
- Run `pnpm dev` or `pnpm start` (dev servers)
- Use `node:fs`, `node:path`, etc. directly (use Effect-TS equivalents)

**ALWAYS**:
- Use Effect-TS for all backend side effects
- Use Hono RPC + TanStack Query for all API calls
- Follow TDD: write tests first, then implement
- Run `pnpm typecheck` and `pnpm fix` before committing

## Project Overview

Claude Code Viewer reads Claude Code session logs directly from JSONL files (`~/.claude/projects/`) with zero data loss. It's a web-based client built as a CLI tool serving a Next.js application.

**Core Architecture**:
- Frontend: Next.js 15 + React 19 + TanStack Query
- Backend: Hono + Effect-TS (all business logic)
- Data: Direct JSONL reads with strict Zod validation
- Real-time: Server-Sent Events (SSE) for live updates

## Development Workflow

### Quality Checks

```bash
# Type checking (mandatory before commits)
pnpm typecheck

# Auto-fix linting and formatting (Biome)
pnpm fix
```

After `pnpm fix`, manually address any remaining issues.

### Testing

```bash
# Run unit tests
pnpm test
```

**TDD Workflow**: Write tests → Run tests → Implement → Verify → Quality checks

## Key Directory Patterns

- `src/app/api/[[...route]]/` - Hono API entry point (all routes defined here)
- `src/server/core/` - Effect-TS business logic (domain modules: session, project, git, etc.)
- `src/lib/conversation-schema/` - Zod schemas for JSONL validation
- `src/testing/layers/` - Reusable Effect test layers (`testPlatformLayer` is the foundation)

## Coding Standards

### Backend: Effect-TS

**Prioritize Pure Functions**:
- Extract logic into pure, testable functions whenever possible
- Pure functions are easier to test, reason about, and maintain
- Only use Effect-TS when side effects or state management is required

**Use Effect-TS for Side Effects and State**:
- Mandatory for I/O operations, async code, and stateful logic
- Avoid class-based implementations or mutable variables for state
- Use Effect-TS's functional patterns for state management
- Reference: https://effect.website/llms.txt

**Testing with Layers**:
```typescript
import { expect, test } from "vitest"
import { Effect } from "effect"
import { testPlatformLayer } from "@/testing/layers"
import { yourEffect } from "./your-module"

test("example", async () => {
  const result = await Effect.runPromise(
    yourEffect.pipe(Effect.provide(testPlatformLayer))
  )
  expect(result).toBe(expectedValue)
})
```

**Avoid Node.js Built-ins**:
- Use `FileSystem.FileSystem` instead of `node:fs`
- Use `Path.Path` instead of `node:path`
- Use `Command.string` instead of `child_process`

This enables dependency injection and proper testing.

**Type Safety - NO `as` Casting**:
- `as` casting is **strictly prohibited**
- If types seem unsolvable without `as`, explain the problem to the user and ask for guidance
- Valid alternatives: type guards, assertion functions, Zod schema validation

### Frontend: API Access

**Hono RPC + TanStack Query Only**:
```typescript
import { api } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"

const { data } = useQuery({
  queryKey: ["example"],
  queryFn: () => api.endpoint.$get().then(res => res.json())
})
```

Raw `fetch` and direct requests are prohibited.

### Tech Standards

- **Linter/Formatter**: Biome (not ESLint/Prettier)
- **Type Config**: `@tsconfig/strictest`
- **Path Alias**: `@/*` maps to `./src/*`

## Architecture Details

### SSE (Server-Sent Events)

**When to Use SSE**:
- Delivering session log updates to frontend
- Notifying clients of background process state changes
- **Never** for request-response patterns (use Hono RPC instead)

**Implementation**:
- Server: `/api/sse` endpoint with type-safe events (`TypeSafeSSE`)
- Client: `useServerEventListener` hook for subscriptions

### Data Layer

- **Single Source of Truth**: `~/.claude/projects/*.jsonl`
- **Cache**: `~/.claude-code-viewer/` (invalidated via SSE when source changes)
- **Validation**: Strict Zod schemas ensure every field is captured

### Session Process Management

Claude Code processes remain alive in the background (unless aborted), allowing session continuation without changing session-id.

## Development Tips

1. **Session Logs**: Examine `~/.claude/projects/` JSONL files to understand data structures
2. **Mock Data**: `mock-global-claude-dir/` contains E2E test mocks (useful reference for schema examples)
3. **Effect-TS Help**: https://effect.website/llms.txt
