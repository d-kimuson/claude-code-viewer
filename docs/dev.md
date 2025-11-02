# Developer Documentation

This document provides technical details for developers contributing to Claude Code Viewer.

## Architecture Overview

### Frontend

- **Framework**: Vite + TanStack Router
- **UI Libraries**: React 19, Radix UI, Tailwind CSS
- **State Management**: Jotai (global state), TanStack Query (server state)

### Backend

- **API Framework**: Hono (standalone server with @hono/node-server)
  - Type-safe communication via Hono RPC
  - Validation using `@hono/zod-validator`
- **Effect-TS**: All backend business logic is implemented using Effect-TS
  - Service layer managed through Effect Context (dependency injection container)
  - Controller → Service layered architecture, with each layer implemented in Effect
  - Type-safe error handling and side effect control
  - Abstracts Node.js built-ins (`FileSystem.FileSystem`, `Path.Path`, `Command.string`) for testability

### Data Source and Storage

- **Single Source of Truth (SSoT)**: Claude Code's standard session logs (`~/.claude/projects/`)
  - No separate database; reads directly from JSONL files
  - Strict validation via Zod schemas ensures conversation data integrity
- **Caching Mechanism**: For performance optimization, metadata is cached in `~/.claude-code-viewer/`
  - Frequently accessed data like session lists and project information
  - Cache is automatically invalidated via SSE events

### Real-time Synchronization

- **Server-Sent Events (SSE)**: Provides `/api/sse` endpoint (src/server/hono/route.ts:430-444)
  - Clients maintain persistent SSE connections to listen for server events
  - Real-time delivery of session log updates, process state changes, etc.
  - Type-safe SSE events (`TypeSafeSSE` service) guarantee payload types for each event kind via `SSEEventDeclaration`
  - Event types: connect, heartbeat, sessionListChanged, sessionChanged, sessionProcessChanged, permissionRequested
  - `SSEController` subscribes to EventBus and broadcasts typed events using `TypeSafeSSE.writeSSE()`
  - Client-side easily subscribes to events using the `useServerEventListener` hook

### Session Process Management

Claude Code Viewer provides advanced control over Claude Code session processes:

- After starting a session, the process remains in the background unless explicitly aborted
- Paused sessions can continue without changing the session-id (no resume needed)
- Memory sharing between processes is required, making production build verification crucial

## Development Environment Setup

### Requirements

- **Node.js**: Version 20.19.0 or later (see [.node-version](../.node-version))
- **Package Manager**: pnpm 10.8.1 or later

### Initial Setup

```bash
# Install dependencies
pnpm install
```

## Starting the Development Server

### Development Mode

```bash
pnpm dev
```

This command starts both servers in parallel using `npm-run-all2`:
- Frontend: Vite development server (port 3400 by default, configurable via `DEV_FE_PORT`)
- Backend: Node server with tsx watch (port 3401 by default, configurable via `DEV_BE_PORT`)

Frontend proxy configuration forwards `/api` requests to the backend server.

### Production Mode

Build and run in production mode:

```bash
# Build
pnpm build

# Start production server
pnpm start
```

**Build Process** (`./scripts/build.sh`):
1. Clean `dist/` directory
2. Compile i18n files (`lingui:compile`)
3. Build frontend with Vite → `dist/static/`
4. Bundle backend with esbuild → `dist/main.js` (ESM format, external dependencies excluded)

**Build Output Structure**:
```
dist/
├── main.js          # Backend server bundle + CLI entry point
├── main.js.map      # Source map
└── static/          # Frontend static files (Vite output)
    ├── index.html
    └── assets/
```

The production server serves static files and handles API requests on a single port (3000 by default, configurable via `PORT`). The `dist/main.js` is registered as the CLI binary in `package.json`'s `bin` field.

## Quality Assurance

### Code Formatter & Linter: Biome

[Biome](https://biomejs.dev/) is used as the formatter and linter.

**Commands**:

```bash
# Auto-fix issues (format + lint with unsafe fixes)
pnpm fix

# Check only (format + lint check, run in CI)
pnpm lint
```

**Configuration**: `/biome.json`
- Recommended rules enabled
- `noProcessEnv` set to error level
- e2e and config files excluded from checks

**CI Requirement**: Passing Biome checks is mandatory for PR merges.

### Unit Tests: Vitest

Vitest-based tests are written for backend core logic (Effect-TS based service layer).

**Commands**:

```bash
# Run once
pnpm test

# Watch mode
pnpm test:watch
```

**Configuration**:
- Global mode enabled
- Setup file: `src/testing/setup/vitest.setup.ts`

**Test Coverage**: Primarily business logic under `src/server/core/`

**CI Requirement**: All tests must pass for PR merges.

### Type Checking: TypeScript

```bash
pnpm typecheck
```

Strict type configuration (`@tsconfig/strictest`) is adopted, emphasizing type safety.

### E2E Snapshot Testing (VRT)

Playwright-based snapshot capture is implemented to visually confirm UI changes.

**Note**: This is Visual Regression Testing (VRT) for confirming UI changes, not traditional E2E testing.

**Implementation**: Custom TypeScript script (not standard Playwright config file)

#### Local Execution

```bash
# Run server startup and snapshot capture together
pnpm e2e

# Or execute manually
pnpm e2e:start-server        # Start server
pnpm e2e:capture-snapshots   # Capture snapshots
```

**Important**: In local environments, UI varies based on the current path. **Do not commit locally captured snapshots**.

#### Automatic Updates in CI

When the `vrt` label is added to a PR, the VRT workflow (`.github/workflows/vrt.yml`) automatically captures and commits snapshots. Use this label for PRs with UI changes to update snapshots.

## Project Structure

```
src/
├── routes/                # TanStack Router routes
│   ├── __root.tsx        # Root route with providers
│   ├── index.tsx         # Home route
│   └── projects/         # Project-related routes
├── app/                   # Shared components and hooks (legacy directory name)
│   ├── components/       # Shared components
│   ├── hooks/            # Custom hooks
│   └── projects/         # Project-related page components
├── components/           # UI components library
│   └── ui/              # shadcn/ui components
├── lib/                  # Frontend common logic
│   ├── api/             # API client (Hono RPC)
│   ├── sse/             # SSE connection management
│   └── conversation-schema/  # Zod schemas for conversation logs
├── server/              # Backend implementation
│   ├── core/           # Core domain logic (Effect-TS)
│   │   ├── claude-code/  # Claude Code integration
│   │   ├── events/       # SSE event management
│   │   ├── session/      # Session management
│   │   └── ...
│   ├── hono/           # Hono application
│   │   ├── app.ts      # Hono app instance
│   │   └── route.ts    # API routes definition
│   ├── lib/            # Backend common utilities
│   └── main.ts         # Server entry point
└── testing/            # Test helpers and mocks
```

## Development Tips

1. **Learning Effect-TS**: The backend is built with Effect-TS. Refer to the [official documentation](https://effect.website/)
2. **Debugging SSE**: Check the Network tab in browser developer tools to inspect SSE connections
3. **Log Inspection**: Directly reference JSONL files under `~/.claude/projects/` to understand data structures
4. **Mock Data**: Mock data for E2E tests in `mock-global-claude-dir/` is useful for development reference

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with appropriate tests
4. Ensure all quality checks pass (`pnpm lint`, `pnpm test`, `pnpm typecheck`)
5. Submit a pull request with a clear description of your changes

For UI changes, add the `vrt` label to your PR to update visual snapshots.
