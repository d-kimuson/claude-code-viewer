# Changelog

## 0.7.1

### &nbsp;&nbsp;&nbsp;Features

- Support permission-mode entry in session logs &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(a80b7)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a80b758)
- Show tool results in visual view and unify code font &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(e384c)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e384c75)
- Optimize permission requests with auto-approve and tool visualizers &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** in https://github.com/d-kimuson/claude-code-viewer/issues/174 [<samp>(3a34b)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/3a34b27)
- Improve file viewer dialog with Suspense loading and refined UI &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(cb562)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/cb56235)
- Add agent selection to session creation menu &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(da6f5)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/da6f548)
- Add visual view for TaskCreate/TaskUpdate tool calls &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(a12bb)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a12bbab)
- Add subscription mode to opt out of Agent SDK features &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(e9445)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e9445ed)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Fix tool result display to show actual success/error messages instead of generic labels &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(36898)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/368987f)
- Improve auto-scroll reliability and scroll to bottom on message send &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(eb36b)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/eb36be9)
- Virtual message not displaying on continue/resume &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** in https://github.com/d-kimuson/claude-code-viewer/issues/176 [<samp>(178b8)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/178b8f6)
- Improve push notification navigation and reduce excessive notifications &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** in https://github.com/d-kimuson/claude-code-viewer/issues/177 [<samp>(66977)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/6697738)
- Fix overscroll behavior to prevent bounce and allow smooth conversation log scrolling &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(2e1a6)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/2e1a6b1)
- Prevent usage mode dialog flash and fix copy button disabled state &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(c4a66)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/c4a661e)
- Fix system prompt opt-out, agent flag, and UTF-8 encoding in terminal and clipboard &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(57bcb)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/57bcbb5)
- Notification click focuses existing PWA window instead of opening a new one &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(1c2bf)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/1c2bf0d)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.7.0...0.7.1)

## 0.7.0

### &nbsp;&nbsp;&nbsp;Features

- Translate permission request tool actions to natural language &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(442bc)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/442bc40)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.6.1-beta.4...0.7.0)

## 0.6.1-beta.4

### &nbsp;&nbsp;&nbsp;Bug Fixes

- IOS PWA のバウンススクロールを修正 &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(9cb5f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/9cb5fd4)
- Restore reliable web push delivery and resubscription &nbsp;-&nbsp; by **d-kimsuon** [<samp>(93cd3)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/93cd35d)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.6.1-beta.3...0.6.1-beta.4)

## 0.6.1-beta.3

### &nbsp;&nbsp;&nbsp;Features

- Push 通知を有効化するボタンを設定画面に追加 &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(0311d)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0311d63)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- IOS PWA の overscroll バウンスを無効化 &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(8f13f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/8f13f62)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.6.1-beta.2...0.6.1-beta.3)

## 0.6.1-beta.2

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Long URLs in user messages overflowing content width &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(8b65a)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/8b65a57)
- PWA の静的ファイルが正しく配信されない問題を修正 &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(8c83f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/8c83f11)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.6.1-beta.1...0.6.1-beta.2)

## 0.6.1-beta.1

### &nbsp;&nbsp;&nbsp;Features

- Scroll active session into view and allow typing while running &nbsp;-&nbsp; by **Vic liu** and **Claude Sonnet 4.6** [<samp>(1e7fe)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/1e7fee0)
- Add PWA support for installable app experience &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(1d148)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/1d148f8)
- Improve mobile UI with touch target expansion and swipe gestures &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(65b13)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/65b132c)
- Support pr-link and last-prompt schema entries with PR metadata display &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(b89fd)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/b89fd24)
- Improve header and sidebar layout for mobile and desktop &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(38b9a)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/38b9abf)
- Add project switcher combobox in header &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(2f00b)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/2f00b80)
- Add copy buttons to markdown messages &nbsp;-&nbsp; by **d-kimsuon** [<samp>(be316)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/be31686)
- Inline session options toolbar with per-project persistence &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(23d0a)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/23d0ae9)
- Add session completion notifications with PWA push support &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(9b3ea)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/9b3ea07)
- Add voice input button to chat input &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(dae6e)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/dae6ef2)
- Event-based approval system with CCVAskUserQuestion MCP tool &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(ef574)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/ef574c0)
- Add push-style mobile sidebar with tab selector &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(1aa74)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/1aa74d0)
- Add visual mode for tool displays with Raw toggle &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(92a61)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/92a611b)
- Save chat input drafts per project and session &nbsp;-&nbsp; by **d-kimsuon** [<samp>(8e44c)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/8e44c9d)
- Support pasting clipboard images into chat input &nbsp;-&nbsp; by **d-kimsuon** [<samp>(e743f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e743f83)
- Enhance review with inline diff comments and move commit UI to git view &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(59fbd)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/59fbd90)
- Rename Files/Tools tab to Explorer and reorder right panel tabs &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(cd059)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/cd05952)
- Speed up review panel by virtualizing diff rendering &nbsp;-&nbsp; by **d-kimsuon** [<samp>(78ee5)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/78ee5c8)
- Speed up review panel by virtualizing diff rendering" &nbsp;-&nbsp; by **d-kimsuon** [<samp>(1f3a0)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/1f3a005)
- Add mobile search button and project list navigation in sidebar &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(ab249)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/ab249b9)
- Add scope toggle to search dialog for cross-project search &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(e5dab)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e5dabbf)
- Add header to projects list page &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(4ec88)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/4ec884f)
- Add inline TodoWrite visualizer in conversation list &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(ae3d6)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/ae3d66d)
- Add configurable find hotkey (Ctrl+F / Command+F) for in-page search &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(cedb9)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/cedb975)
- Improve terminal UX on mobile with keyboard shortcuts and touch scroll &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(d47b2)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/d47b2a4)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Right panel opening by default on mobile devices &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(2dfe2)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/2dfe2d5)
- Show user-renamed session title in session list &nbsp;-&nbsp; by **Vic liu** and **Claude Sonnet 4.6** [<samp>(0bfe9)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0bfe92b)
- Apply customTitle to recent sessions list in SessionPageMain &nbsp;-&nbsp; by **Vic liu** and **Claude Sonnet 4.6** [<samp>(2053e)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/2053e71)
- Suppress false "Task completed" toast when switching sessions &nbsp;-&nbsp; by **Vic liu** and **Claude Sonnet 4.6** [<samp>(0c974)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0c9748e)
- Reset running state on session switch to prevent false completion toast &nbsp;-&nbsp; by **Vic liu** [<samp>(0bd58)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0bd5823)
- Scroll conversation to bottom when switching sessions &nbsp;-&nbsp; by **Vic liu** and **Claude Sonnet 4.6** [<samp>(fc71f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/fc71f17)
- Support Agent tool for subagent display and hide empty thinking blocks &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(e3f92)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e3f9215)
- Tool_result entries with tool_reference content failing to parse &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(55222)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/55222d8)
- SSE event listeners not working due to StrictMode stale ref &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(24dc9)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/24dc905)
- Right panel overlapping dialogs and modals &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(61586)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/6158654)
- Improve inline code wrapping and diff viewer layout &nbsp;-&nbsp; by **d-kimsuon** [<samp>(5b3aa)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/5b3aa70)
- Improve diff viewer scrolling and code font &nbsp;-&nbsp; by **d-kimsuon** [<samp>(38ddf)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/38ddf4a)
- Unify horizontal scrolling across diff hunks &nbsp;-&nbsp; by **d-kimsuon** [<samp>(f673f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/f673faf)
- Improve right panel resize performance and review tab rendering &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(c5767)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/c576736)
- Move commit section above file list in git view &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(37d96)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/37d96ee)
- Prevent shell injection in getMcpListOutput &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(fb103)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/fb103b4)
- Replace dead try/catch with Effect error handling in GitController &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(61890)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/61890d5)
- Hash session token and improve error handling &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(64f74)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/64f741a)
- Add boundary validation for projectId and sessionId &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(7c094)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/7c09409)
- Resolve nested button warning in git file list &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(1f1ff)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/1f1ff42)
- Prevent black screen when switching projects in Project Switcher &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(c49e0)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/c49e00b)
- Clarify empty explorer state in right panel &nbsp;-&nbsp; by **d-kimsuon** [<samp>(4eae9)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/4eae92e)
- Stabilize virtualized session conversation rendering &nbsp;-&nbsp; by **d-kimsuon** [<samp>(fddf7)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/fddf74f)
- Resolve claude executable path without shell mode &nbsp;-&nbsp; by **d-kimsuon** [<samp>(602c4)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/602c4f4)
- Support enqueue queue-operation without content field &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(fc5ab)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/fc5ab1a)
- Hide timestamp-only rows for assistant messages with no renderable content &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(04449)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/044495f)
- Scheduled sessions not executing due to ULID sessionId &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(882e1)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/882e174)
- Notification not consumed when navigating directly to session via hard reload &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(5285e)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/5285e13)
- Resolve QA issues in parsing and schema validation &nbsp;-&nbsp; by **d-kimsuon** [<samp>(1a54e)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/1a54ed5)
- Prevent startup crash before CLI options load &nbsp;-&nbsp; by **d-kimsuon** [<samp>(7c12d)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/7c12dc0)

### &nbsp;&nbsp;&nbsp;Performance

- Reduce unnecessary re-renders and polling overhead &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.6** [<samp>(a5931)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a5931b0)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.6.0...0.6.1-beta.1)

## 0.6.0

### &nbsp;&nbsp;&nbsp;Features

- **Terminal panel**: Run shell commands directly within the UI. Collapsible panel with auto-close behavior and persistent output across panel toggles
- **Files & tools inspector**: View edited files with content preview, tool call history, and quick-action buttons in the right panel
- **Agent sessions in Explorer**: Browse subagent sessions from the Explorer tab
- **Headless API server mode**: New `--api-only` flag to run the server without opening a browser, useful for integrations and automation
- **Bearer token authentication**: API authentication via bearer tokens for programmatic access
- **Git tab improvements**: View the current git branch without an active session, with a reload button for refreshing git data
- **Right panel state in URL**: Panel state is now persisted in the URL, making it shareable and restorable
- **Message sending options**: Specify Claude Code options (model, prompt, etc.) when sending messages
- **Session list improvements**: Running/paused status indicators and cleaner session titles

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Session title becoming empty after `/clear` command
- "No Branch" flash while git data is loading
- Multi-file viewing stability in the file content dialog
- Handling of result-only sessions and local command outputs
- Support for `custom-title` and `agent-name` session log entry types

### &nbsp;&nbsp;&nbsp;Performance

- UI rendering and resize performance improvements

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.5.9...v0.6.0)

## 0.5.9

### &nbsp;&nbsp;&nbsp;Features

- Add lingui-extract hook and update reference line numbers in i18n message source files &nbsp;-&nbsp; by **zhube** [<samp>(ad9d8)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/ad9d8e7)
- Update the lefthook configuration, add a compilation step and temporarily store the entire i18n locales directory after lingui extraction. &nbsp;-&nbsp; by **zhube** [<samp>(f1ce7)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/f1ce7be)
- Added task management functionality to the session sidebar and refactored the server dependency injection layer. &nbsp;-&nbsp; by **ZHUBoer** [<samp>(2bda6)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/2bda682)
- Added detection of websites that block embedded previews &nbsp;-&nbsp; by **ZHUBoer** [<samp>(efeae)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/efeae43)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Handle missing task directories gracefully and improve task sidebar UI &nbsp;-&nbsp; by **d-kimsuon** and **Claude Opus 4.5** [<samp>(58a25)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/58a25e6)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.5.8...0.5.9)

## 0.5.8

### &nbsp;&nbsp;&nbsp;Features

- Add auto-schedule continue on rate limit setting - sessions can automatically resume when Claude Code encounters rate limits &nbsp;-&nbsp; by **d-kimsuon** [<samp>(4f4d1)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/4f4d1fb)
- Display MCP server health status in addition to availability &nbsp;-&nbsp; by **zhube** [<samp>(7eff6)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/7eff6fc)
- Enhanced Markdown rendering in exported conversations with improved syntax support and tool result content &nbsp;-&nbsp; by **zhube** [<samp>(d053d)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/d053d6c)
- Display message timestamps in conversation view &nbsp;-&nbsp; by **zhube** [<samp>(7def2)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/7def2b3)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Use Path service for cross-platform file path construction &nbsp;-&nbsp; by **d-kimsuon** and **Claude Opus 4.5** [<samp>(d1aaf)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/d1aaf57)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.5.7...0.5.8)

## 0.5.7

### &nbsp;&nbsp;&nbsp;Features

- Add session delete API endpoint &nbsp;-&nbsp; by **d-kimsuon** and **Claude Opus 4.5** [<samp>(9c7fd)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/9c7fdb3)
- Add delete session confirmation dialog &nbsp;-&nbsp; by **d-kimsuon** and **Claude Opus 4.5** [<samp>(590d6)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/590d609)
- Integrate session delete into sidebar &nbsp;-&nbsp; by **d-kimsuon** and **Claude Opus 4.5** [<samp>(663eb)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/663ebc0)
- Add delete button to session info popover &nbsp;-&nbsp; by **d-kimsuon** and **Claude Opus 4.5** [<samp>(9c4f4)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/9c4f494)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Update lingui compilation output &nbsp;-&nbsp; by **d-kimsuon** and **Claude Opus 4.5** [<samp>(4dc73)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/4dc7342)
- Enhance styling for DeleteSessionDialog component, this can avoid title too long that exceed the size of DeleteSessionDialog component &nbsp;-&nbsp; by **70akaline** [<samp>(db39b)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/db39b24)
- Fixed the problem that the card title text on the project list page exceeds the &nbsp;-&nbsp; by **zhube** [<samp>(cc20d)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/cc20dc7)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.5.6...0.5.7)

## 0.5.6

### &nbsp;&nbsp;&nbsp;Features

- Add Claude model name to session metadata popover &nbsp;-&nbsp; by **Ryan Malia** [<samp>(060b5)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/060b538)
- Support new subagent log structure and fix task data issues &nbsp;-&nbsp; by **zhube** [<samp>(5df48)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/5df48fa)
- Introduce virtual conversation update events to reduce perceived latency, enhance system message display for more detailed information, and add polling fallback for session queries &nbsp;-&nbsp; by **zhube** [<samp>(4d9e6)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/4d9e6e8)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Improve autocomplete indicator visibility logic &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.5** [<samp>(b8388)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/b8388bd)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.5.5...0.5.6)

## 0.5.5

### &nbsp;&nbsp;&nbsp;Features

- Disable AskUserQuestion tool, because ccviewer currently not support this &nbsp;-&nbsp; by **d-kimsuon** [<samp>(6acca)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/6accaaa)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Add missing schema types for Claude Code v2.1.x &nbsp;-&nbsp; by **Martin Spasov** and **Claude Opus 4.5** [<samp>(e8356)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e8356de)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.5.4...0.5.5)

## 0.5.4

### &nbsp;&nbsp;&nbsp;Features

- Display full timestamp in search results &nbsp;-&nbsp; by **Ryan Malia** [<samp>(fa33e)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/fa33e04)
- Add search hotkey customization between Ctrl+K and Command+K &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.5** [<samp>(2fa75)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/2fa751b)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Resolve review issues in search hotkey customization &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.5** [<samp>(b667c)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/b667c4b)
- Add missing translations for "Select search hotkey" &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.5** [<samp>(937b0)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/937b070)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.5.3...0.5.4)

## 0.5.3

### &nbsp;&nbsp;&nbsp;Features

- Update Claude model pricing to latest versions &nbsp;-&nbsp; by **d-kimsuon** and **Claude Sonnet 4.5** [<samp>(944ab)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/944ab42)
- Display reserved message in conversation view &nbsp;-&nbsp; by **d-kimsuon** [<samp>(0e834)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0e834db)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Problem that submit button not displayed for scheduled message in mobile &nbsp;-&nbsp; by **d-kimsuon** [<samp>(4c8cf)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/4c8cf03)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.5.2...0.5.3)

## 0.5.2

_No significant changes_

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.5.1...0.5.2)

## 0.5.1

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Restore shebang for entry script &nbsp;-&nbsp; by **d-kimsuon** [<samp>(8fce0)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/8fce0c8)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.5.0...0.5.1)

## 0.5.0

### &nbsp;&nbsp;&nbsp;Breaking Changes

- Support for command-line options. Renamed existing environment variable settin &nbsp;-&nbsp; by **d-kimsuon** [<samp>(0e424)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0e424fc)

### &nbsp;&nbsp;&nbsp;Features

- Add migration guide message for deprecated or removed env vars &nbsp;-&nbsp; by **d-kimsuon** [<samp>(4f457)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/4f45775)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Display preview url missing &nbsp;-&nbsp; by **d-kimsuon** [<samp>(58d49)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/58d49bc)
- Correct start script path from index.js to main.js &nbsp;-&nbsp; by **Martin Spasov** and **Claude Opus 4.5** [<samp>(13534)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/1353417)
- Add schema support for Claude Code v2.0.76+ entry types &nbsp;-&nbsp; by **Martin Spasov** and **Claude Opus 4.5** [<samp>(5afdb)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/5afdbf1)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.15...0.5.0)

## Unreleased

### &nbsp;&nbsp;&nbsp;Breaking Changes

- **Command-line options support**: Claude Code Viewer now supports command-line options for configuration. Command-line options take precedence over environment variables &nbsp;-&nbsp; by **d-kimsuon** [<samp>(0e424)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0e424fc)
- **Environment variable names changed**: To improve consistency and reduce verbosity, environment variable names have been updated:
  - `CLAUDE_CODE_VIEWER_AUTH_PASSWORD` → `CCV_PASSWORD`
  - `CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH` → `CCV_CC_EXECUTABLE_PATH`
  - New environment variable added: `CCV_GLOBAL_CLAUDE_DIR` (previously the Claude directory path was hardcoded to `~/.claude`)
  - Old environment variable names are no longer supported. Please update your configuration to use the new names.

### &nbsp;&nbsp;&nbsp;Features

- Add command-line options: `--port`, `--hostname`, `--password`, `--executable`, `--claude-dir` &nbsp;-&nbsp; by **d-kimsuon** [<samp>(0e424)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0e424fc)
- Command-line options take precedence over environment variables, allowing flexible configuration &nbsp;-&nbsp; by **d-kimsuon** [<samp>(0e424)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0e424fc)

### &nbsp;&nbsp;&nbsp;Migration Guide

If you're using environment variables in your deployment, update them as follows:

```bash
# Old (no longer supported)
CLAUDE_CODE_VIEWER_AUTH_PASSWORD=secret
CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH=/path/to/claude

# New
CCV_PASSWORD=secret
CCV_CC_EXECUTABLE_PATH=/path/to/claude
CCV_GLOBAL_CLAUDE_DIR=~/.claude  # Optional: defaults to ~/.claude
```

Alternatively, you can now use command-line options:

```bash
# Using command-line options
claude-code-viewer --password secret --executable /path/to/claude --claude-dir ~/.claude
```

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.15...main)

## 0.4.15

### &nbsp;&nbsp;&nbsp;Features

- Add HOSTNAME environment variable for remote access &nbsp;-&nbsp; by **Kyle Graehl** [<samp>(8d4ca)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/8d4cac4)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Handle query parameters in snapshot directory paths &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(d63eb)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/d63eb5b)
- Extend MCP launch timeout from 20s to 60s &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(297d9)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/297d96f)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.14...0.4.15)

## 0.4.14

### &nbsp;&nbsp;&nbsp;Features

- **Browser Preview**: View web pages directly within the viewer. URLs in conversation are automatically detected and displayed in an integrated preview panel with manual URL input support &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(8cdea)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/8cdea33) [<samp>(9a059)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/9a0599e) [<samp>(a9864)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a986434) [<samp>(91c82)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/91c8293)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Session costs now correctly include usage from all subagent sessions &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(b8b7b)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/b8b7bd1) [<samp>(0047e)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0047ebf)
- Prioritize globally installed Claude Code over bundled version &nbsp;-&nbsp; by **d-kimsuon** [<samp>(9e9ea)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/9e9eaa4)
- Improve abort button visibility in light mode &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(0e7da)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0e7dafa)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.13...0.4.14)

## 0.4.13

_No significant changes_

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.11...v0.4.12)

## 0.4.12

_No significant changes_

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.11...0.4.12)

## 0.4.11

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Bug that resolve npx cache directory instead of system installed claude code &nbsp;-&nbsp; by **d-kimsuon** [<samp>(f438c)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/f438c31)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.10...0.4.11)

## 0.4.10

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Bug that resolve buildIn Claude though claude installed in system &nbsp;-&nbsp; by **d-kimsuon** [<samp>(c5625)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/c5625e7)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.9...0.4.10)

## 0.4.9

_No significant changes_

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.8...0.4.9)

## 0.4.8

### &nbsp;&nbsp;&nbsp;Features

- **Password Authentication**: Protect your Claude Code Viewer instance with simple password-based authentication. Set `CLAUDE_CODE_VIEWER_AUTH_PASSWORD` environment variable to enable login protection for remote deployments &nbsp;-&nbsp; by **Harshit Arora** [<samp>(c2002)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/c20022c)
- **Full-text Search**: Search across all conversations with `⌘K` (macOS) or `Ctrl+K` (Linux). Features fuzzy matching, prefix search, and keyboard navigation for quick access to past discussions &nbsp;-&nbsp; by **Sam** [<samp>(741f3)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/741f36d)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.6...0.4.8)

## 0.4.7

### &nbsp;&nbsp;&nbsp;Features

- Support slash commands in subdirectories: Command files (`.claude/commands/`) can now be nested in subdirectories and are properly discovered &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(097b2)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/097b28e) [<samp>(d5577)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/d55778f)
- Agent session separation: Now supports viewing subagent conversations in Claude Code v2.0.28+ log format &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(f4d80)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/f4d80e4)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.6...0.4.7)

## 0.4.6

### &nbsp;&nbsp;&nbsp;Features

- Add export (download) option for conversations &nbsp;-&nbsp; by **Sam** [<samp>(7f389)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/7f389e5)
- Session detail page now reads the session via query parameter, enabling a smoother handoff from the new session page and reducing layout shifts.

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Support array content format in queue-operation enqueue schema &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(a35fe)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a35febe)
- Issue where Effect-TS fails to launch due to mismatched peer versions &nbsp;-&nbsp; by **d-kimsuon** [<samp>(1aed3)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/1aed365)
- Issue where default options are not reflected correctly. &nbsp;-&nbsp; by **d-kimuson** [<samp>(6155f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/6155fec)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.5...0.4.6)

## 0.4.5

### &nbsp;&nbsp;&nbsp;Features

- Detect language, do not hard code `ja` &nbsp;-&nbsp; by **scarletsky** [<samp>(86279)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/86279dd)
- Add pricing constants and cost calculation functions &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(64397)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/643970a)
- Extend SessionMeta schema with cost information &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(571bc)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/571bc1f)
- Add UI display for session cost in list and detail views &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(d9b36)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/d9b364e)
- Add i18n translations for session cost labels &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(68500)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/68500bf)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.4...0.4.5)

## 0.4.4

### &nbsp;&nbsp;&nbsp;Features

- Support docker & docker-compose &nbsp;-&nbsp; by **scarletsky** [<samp>(5e5a1)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/5e5a1fd)
- **i18n**: Support zh_CN &nbsp;-&nbsp; by **scarletsky** in https://github.com/d-kimuson/claude-code-viewer/issues/51 [<samp>(de3d4)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/de3d43b)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.3...0.4.4)

## 0.4.3

### &nbsp;&nbsp;&nbsp;Features

- Support markdown and source code file display &nbsp;-&nbsp; by **d-kimsuon** and **Claude** in https://github.com/d-kimuson/claude-code-viewer/issues/40 [<samp>(e17b5)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e17b58b)
- Filter git revisions to show only base and current branches &nbsp;-&nbsp; by **d-kimsuon** and **Claude** in https://github.com/d-kimuson/claude-code-viewer/issues/47 [<samp>(158db)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/158db20)
- Remove 4000 character limit for new chat input &nbsp;-&nbsp; by **d-kimsuon** and **Claude** in https://github.com/d-kimuson/claude-code-viewer/issues/44 [<samp>(76ab4)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/76ab4d6)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Change unifySameTitleSession default value to false &nbsp;-&nbsp; by **d-kimsuon** and **Claude** in https://github.com/d-kimuson/claude-code-viewer/issues/48 [<samp>(6c93f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/6c93fe5)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.2...0.4.3)

## 0.4.2

_No significant changes_

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.2-beta.2...0.4.2)

## 0.4.2-beta.2

_No significant changes_

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.2-beta.1...0.4.2-beta.2)

## 0.4.2-beta.1

### &nbsp;&nbsp;&nbsp;Features

- File upload(plain text, pdf, image) #34 &nbsp;-&nbsp; by **d-kimsuon** in https://github.com/d-kimuson/claude-code-viewer/issues/34 [<samp>(51280)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/51280f5)
- Send reserved feature for current session &nbsp;-&nbsp; by **d-kimsuon** [<samp>(9fbe4)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/9fbe4d7)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.1...0.4.2-beta.1)

## 0.4.1

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Git Diff View works in subdirectories &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(7ac09)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/7ac09bb)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.0...0.4.1)

## 0.4.0

### &nbsp;&nbsp;&nbsp;Features

- Tool execution approval: Claude's tool calls can now be reviewed and approved before execution with permission mode support &nbsp;-&nbsp; by **dobachi** [<samp>(b7e99)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/b7e9947)
- Dark mode: UI now supports dark mode for better viewing experience in low-light environments &nbsp;-&nbsp; by **d-kimsuon**
- Large workspace performance: Significantly improved performance for large workspaces with pagination and caching &nbsp;-&nbsp; by **d-kimsuon** [<samp>(c7d89)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/c7d89d4) [<samp>(d322d)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/d322db5)
- Web-based git commit: Changes can now be committed directly from the diff panel in the web interface &nbsp;-&nbsp; by **d-kimsuon** [<samp>(017d3)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/017d374)
- Latest conversation schema: Support for Claude Code's new conversation schema &nbsp;-&nbsp; by **d-kimsuon** [<samp>(9144f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/9144f26)
- Internationalization: UI is now available in English and Japanese &nbsp;-&nbsp; by **d-kimsuon** [<samp>(4a435)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/4a4354f)
- System information: View system and environment details in a dedicated tab &nbsp;-&nbsp; by **d-kimsuon** [<samp>(0047b)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0047b6b)
- Bundled Claude Code: No need to install Claude Code separately - bundled version is automatically used when not found &nbsp;-&nbsp; by **d-kimsuon** [<samp>(6c4d3)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/6c4d301)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Compatibility: Fixed issues preventing use with Claude Code version 1.0.81 and earlier &nbsp;-&nbsp; by **d-kimsuon** [<samp>(b483e)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/b483e7e) [<samp>(a88ad)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a88ad89) [<samp>(8d592)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/8d592ce)
- Robustness: Improved handling of missing Claude projects directory and Node.js version compatibility &nbsp;-&nbsp; by **kouyaman345** [<samp>(42d02)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/42d028b)

### &nbsp;&nbsp;&nbsp;Performance

- Session synchronization: Sessions started from Claude Code now sync much faster &nbsp;-&nbsp; by **d-kimsuon** [<samp>(eb5a8)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/eb5a8dd)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.3.1...0.4.0)

## 0.4.0-beta.2

### &nbsp;&nbsp;&nbsp;Features

- Introduce speckit commands for feature specification and implementation &nbsp;-&nbsp; by **d-kimsuon** [<samp>(6f7ef)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/6f7ef2a)
- Commit on web diff panel &nbsp;-&nbsp; by **d-kimsuon** [<samp>(017d3)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/017d374)
- Add support for file history snapshots in conversation components &nbsp;-&nbsp; by **d-kimsuon** [<samp>(9144f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/9144f26)
- Enhance commit section in DiffModal with collapsible UI &nbsp;-&nbsp; by **d-kimsuon** [<samp>(170c6)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/170c6ec)
- Add i18n support, avaiable languages are 'en' and 'ja' &nbsp;-&nbsp; by **d-kimsuon** [<samp>(4a435)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/4a4354f)
- Integrate @anthropic-ai/claude-agent-sdk for latest version &nbsp;-&nbsp; by **d-kimsuon** [<samp>(81a5d)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/81a5d31)
- System information view &nbsp;-&nbsp; by **d-kimsuon** [<samp>(0047b)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/0047b6b)
- Enhance conversation components with task handling and UI improvements &nbsp;-&nbsp; by **d-kimsuon** [<samp>(93dc6)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/93dc63a)
- Enhance MobileSidebar with system information tab &nbsp;-&nbsp; by **d-kimsuon** [<samp>(a92f0)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a92f094)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.0-beta.1...0.4.0-beta.2)

## 0.4.0-beta.1

### &nbsp;&nbsp;&nbsp;Features

- Add tool approval mechanism and permission mode support &nbsp;-&nbsp; by **dobachi** [<samp>(b7e99)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/b7e9947)
- Add dark mode support &nbsp;-&nbsp; by **d-kimsuon**
- Improve performance with pagination and caching for large workspaces &nbsp;-&nbsp; by **d-kimsuon** [<samp>(c7d89)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/c7d89d4) [<samp>(d322d)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/d322db5)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Fix compatibility issues with Claude Code version 1.0.81 and below &nbsp;-&nbsp; by **d-kimsuon** [<samp>(b483e)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/b483e7e) [<samp>(a88ad)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a88ad89) [<samp>(8d592)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/8d592ce)
- Handle missing Claude projects directory and Node.js compatibility issues &nbsp;-&nbsp; by **kouyaman345** [<samp>(42d02)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/42d028b)

### &nbsp;&nbsp;&nbsp;Performance

- Improve session synchronization speed for sessions started from Claude Code &nbsp;-&nbsp; by **d-kimsuon** [<samp>(eb5a8)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/eb5a8dd)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.3.1...0.4.0-beta.1)

## 0.3.1

### &nbsp;&nbsp;&nbsp;Features

- Add configurable Enter key behavior for message input &nbsp;-&nbsp; by **nepula_h_okuyama** and **Claude** [<samp>(e37ca)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e37ca87)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Resolve lint and formatting errors &nbsp;-&nbsp; by **amay077** and **Claude** [<samp>(730d1)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/730d134)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.3.0...0.3.1)

## 0.3.0

### &nbsp;&nbsp;&nbsp;Features

- Set timeout for new-chat & resume-chat &nbsp;-&nbsp; by **d-kimsuon** [<samp>(d0fda)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/d0fdade)
- Add @ file completion &nbsp;-&nbsp; by **d-kimsuon** [<samp>(60aaa)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/60aaae7)
- Inline completion for command and files &nbsp;-&nbsp; by **d-kimsuon** [<samp>(e90dc)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e90dc00)
- Fix out of style &nbsp;-&nbsp; by **d-kimsuon** [<samp>(7fafb)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/7fafb18)
- Add simple git diff preview modal &nbsp;-&nbsp; by **d-kimsuon** [<samp>(c5688)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/c568831)
- Add comprehensive CI workflow for quality checks &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(580e5)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/580e51f)
- Add notification when task paused &nbsp;-&nbsp; by **d-kimsuon** [<samp>(8b6b0)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/8b6b03b)
- Add sonner message on task completed &nbsp;-&nbsp; by **d-kimsuon** [<samp>(a3e6f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a3e6feb)
- **diff-view**: Display untacked added file &nbsp;-&nbsp; by **d-kimsuon** [<samp>(e7c3c)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e7c3c87)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Bug fix session list doesn't updated after filter config changed &nbsp;-&nbsp; by **d-kimsuon** [<samp>(52a23)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/52a231b)
- Fix header text content overflow &nbsp;-&nbsp; by **d-kimsuon** [<samp>(a618e)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a618e24)
- Bug fix that input message gone out though new chat is not sent yet &nbsp;-&nbsp; by **d-kimsuon** [<samp>(ca316)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/ca31602)
- Add unsupported container property to schema &nbsp;-&nbsp; by **d-kimsuon** [<samp>(c7a1e)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/c7a1e6d)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.2.4...0.3.0)

## 0.2.4

### &nbsp;&nbsp;&nbsp;Features

- Add Node.js >=20.12.0 requirement to package.json &nbsp;-&nbsp; by **d-kimsuon** and **Claude** [<samp>(7027f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/7027f39)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.2.3...0.2.4)

## 0.2.3

### &nbsp;&nbsp;&nbsp;Features

- Adjust response design &nbsp;-&nbsp; by **d-kimsuon** [<samp>(dca1b)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/dca1be7)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.2.2...0.2.3)

## 0.2.2

### &nbsp;&nbsp;&nbsp;Features

- Adjust style for mobile &nbsp;-&nbsp; by **d-kimsuon** [<samp>(35e72)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/35e72ed)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.2.1...0.2.2)

## 0.2.1

### &nbsp;&nbsp;&nbsp;Features

- Responsive design &nbsp;-&nbsp; by **d-kimsuon** [<samp>(35329)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/3532988)
- Add some default commands &nbsp;-&nbsp; by **d-kimsuon** [<samp>(adccb)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/adccbb8)
- Remove alive sessoins tab &nbsp;-&nbsp; by **d-kimsuon** [<samp>(730eb)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/730eb35)
- Add error report message on invalid schema message &nbsp;-&nbsp; by **d-kimsuon** [<samp>(bac15)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/bac15be)
- Add mcp tab &nbsp;-&nbsp; by **d-kimsuon** [<samp>(155af)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/155afea)
- Display project info in session page &nbsp;-&nbsp; by **d-kimsuon** [<samp>(1b1a8)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/1b1a8ab)

### &nbsp;&nbsp;&nbsp;Bug Fixes

- Remove unnecessary slash from default command &nbsp;-&nbsp; by **d-kimsuon** [<samp>(78000)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/7800037)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.2.0...0.2.1)

## 0.2.0

### &nbsp;&nbsp;&nbsp;Features

- Add unifySameTitleSession option for unify resume messages &nbsp;-&nbsp; by **d-kimsuon** [<samp>(4c721)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/4c72199)
- Syntaxhilight input json &nbsp;-&nbsp; by **d-kimsuon** [<samp>(55f70)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/55f7063)
- Abort running task &nbsp;-&nbsp; by **d-kimsuon** [<samp>(60b9c)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/60b9c65)
- Implement continue chat (not resume if connected) &nbsp;-&nbsp; by **d-kimsuon** [<samp>(79794)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/79794be)
- Improve sync tasks status by using SSE &nbsp;-&nbsp; by **d-kimsuon** [<samp>(521a3)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/521a368)
- Improve sidebar menu &nbsp;-&nbsp; by **d-kimsuon** [<samp>(d9a0f)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/d9a0f17)
- Clean up all tasks before exit &nbsp;-&nbsp; by **d-kimsuon** [<samp>(31da8)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/31da823)
- Improve continue chat experience &nbsp;-&nbsp; by **d-kimsuon** [<samp>(e689d)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/e689dd5)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.1.0...0.2.0)

## 0.1.0

### &nbsp;&nbsp;&nbsp;Features

- Resume and new task &nbsp;-&nbsp; by **d-kimsuon** [<samp>(7c96a)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/7c96a63)
- Move configuration localStorage to server side &nbsp;-&nbsp; by **d-kimsuon** [<samp>(a07b0)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/a07b046)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.0.9...0.1.0)

## 0.0.9

### &nbsp;&nbsp;&nbsp;Features

- Adjust thinking card margin &nbsp;-&nbsp; by **d-kimsuon** [<samp>(04cfb)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/04cfb9f)
- Improve multi-line tool result view. properly handle line breaks. &nbsp;-&nbsp; by **d-kimsuon** [<samp>(9362b)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/9362bb5)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.0.8...0.0.9)

## 0.0.8

_No significant changes_

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.0.7...0.0.8)

## 0.0.7

_No significant changes_

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.0.6...0.0.7)

## 0.0.6

### &nbsp;&nbsp;&nbsp;Features

- Improve sesion title view &nbsp;-&nbsp; by **d-kimsuon** [<samp>(6a8e4)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/6a8e4d2)
- Improve command viewer &nbsp;-&nbsp; by **d-kimsuon** [<samp>(66754)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/66754d9)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.0.1...0.0.6)
