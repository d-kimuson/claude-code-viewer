# Clu Mission Control — Roadmap

*Forked from [claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer)*

## Vision
A unified dashboard to manage both manual Claude Code sessions AND autonomous Clu agent work.

---

## Phase 1: Foundation (Current)
- [x] Fork claude-code-viewer
- [ ] Update branding (name, logo, colors)
- [ ] Add Supabase integration
- [ ] Create "Clu Sessions" concept (separate from manual sessions)

## Phase 2: Task Queue
- [ ] Add task model to Supabase
- [ ] Build Kanban board view (from clu-dashboard)
- [ ] "Assign to Clu" action on tasks
- [ ] Task status sync with Clu activity

## Phase 3: Clu Session Management
- [ ] Mark sessions as "Clu-owned" vs "User-owned"
- [ ] Clu sessions view (filtered)
- [ ] Real-time progress on Clu sessions
- [ ] Handoff protocol (Clu → User)

## Phase 4: Activity & PR Tracking
- [ ] Activity timeline (unified log)
- [ ] GitHub PR integration
- [ ] PR status in sidebar
- [ ] Link PRs to tasks

## Phase 5: Polish
- [ ] Mobile responsive
- [ ] Dark/light mode
- [ ] Notifications
- [ ] Keyboard shortcuts

---

## Architecture Changes

### New Data Models (Supabase)

```sql
-- Tasks (from clu-dashboard)
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL, -- not_started, in_progress, awaiting_approval, complete
  priority INTEGER,
  assigned_to TEXT, -- 'user' | 'clu'
  session_id TEXT, -- links to Claude Code session
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Activities (from clu-dashboard)
CREATE TABLE activities (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  session_id TEXT,
  task_id UUID REFERENCES tasks(id),
  created_at TIMESTAMPTZ
);

-- Session metadata (extends Claude Code logs)
CREATE TABLE session_metadata (
  session_id TEXT PRIMARY KEY,
  owner TEXT NOT NULL, -- 'user' | 'clu'
  task_id UUID REFERENCES tasks(id),
  status TEXT, -- active, paused, completed, handed_off
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### New Routes

- `/tasks` — Kanban board
- `/clu` — Clu sessions view
- `/activity` — Activity timeline
- `/prs` — PR tracker

### Integration Points

1. **Supabase** — Task storage, activity log, session metadata
2. **OpenClaw** — Chat with Clu, trigger tasks
3. **GitHub** — PR status, commits

---

## Tech Stack (Inherited + New)

| Layer | Original | Added |
|-------|----------|-------|
| Frontend | Vite + React 19 + TanStack | - |
| Backend | Hono + Effect-TS | Supabase client |
| Data | JSONL (Claude logs) | + Supabase |
| Real-time | SSE | + Supabase Realtime |
| Auth | Password (basic) | + Supabase Auth (optional) |
