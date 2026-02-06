# Clu Mission Control 🟠

> Unified dashboard to manage Claude Code sessions and Clu autonomous agent work.

Forked from [claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer).

---

A full-featured web-based Claude Code client that provides complete interactive functionality for managing Claude Code projects. Start new conversations, resume existing sessions, monitor running tasks in real-time, and browse your conversation history—all through a modern web interface.

## What's Different

**Clu Mission Control** extends claude-code-viewer with:
- 🟠 Clu branding (orange theme)
- 📋 Task queue for autonomous work (coming soon)
- 🤖 Session ownership tracking (Clu vs User)
- 📊 Activity timeline and PR tracking (coming soon)

## Features

| Feature | Description |
| --- | --- |
| View Chat Logs | View Claude Code session logs in real-time through the web UI |
| Search Conversations | Full-text search across conversations with `⌘K` / `Ctrl+K` |
| Start Conversations | Start Claude Code sessions directly from the web UI |
| Resume Sessions | Resume conversations from existing session logs |
| Continue Sessions | Keep sessions alive for continuous conversations |
| File Upload & Preview | Upload images, PDFs, and text files with inline preview |
| Browser Preview | Preview web applications directly within the dashboard |
| Message Scheduler | Schedule messages using cron or datetime |
| Git Integration | Review changes, commit, and push from the UI |
| MCP Server Viewer | View MCP server configurations |
| Multi-language | English, Japanese, and Simplified Chinese |

## Installation

```bash
# Clone the repo
git clone https://github.com/ehoyos007/clu-mission-control.git
cd clu-mission-control

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Then open http://localhost:5173

## Roadmap

### Phase 1: Foundation ✓
- [x] Fork claude-code-viewer
- [x] Update branding (name, logo, colors → orange 🟠)
- [ ] Add Supabase integration
- [ ] Create "Clu Sessions" concept

### Phase 2: Task Queue
- [ ] Task model in Supabase
- [ ] Kanban board view
- [ ] "Assign to Clu" action
- [ ] Task ↔ Session linking

### Phase 3: Clu Session Management
- [ ] Mark sessions as Clu-owned vs User-owned
- [ ] Filtered "Clu Sessions" view
- [ ] Real-time progress watching
- [ ] Handoff protocol (Clu hits blocker → notifies you)

### Phase 4: Activity & PR Tracking
- [ ] Unified activity timeline
- [ ] GitHub PR integration
- [ ] Link PRs to tasks

### Phase 5: Polish
- [ ] Mobile responsive
- [ ] Notifications
- [ ] Keyboard shortcuts

## Credits

Built on top of [claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer) by [@d-kimuson](https://github.com/d-kimuson).

## License

MIT
