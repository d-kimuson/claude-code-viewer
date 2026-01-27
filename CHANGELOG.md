# Changelog

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

*No significant changes*

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

*No significant changes*

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.11...v0.4.12)

## 0.4.12

*No significant changes*

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

*No significant changes*

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

*No significant changes*

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.4.2-beta.2...0.4.2)

## 0.4.2-beta.2

*No significant changes*

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

*No significant changes*

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.0.7...0.0.8)

## 0.0.7

*No significant changes*

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.0.6...0.0.7)

## 0.0.6

### &nbsp;&nbsp;&nbsp;Features

- Improve sesion title view &nbsp;-&nbsp; by **d-kimsuon** [<samp>(6a8e4)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/6a8e4d2)
- Improve command viewer &nbsp;-&nbsp; by **d-kimsuon** [<samp>(66754)</samp>](https://github.com/d-kimuson/claude-code-viewer/commit/66754d9)

##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](https://github.com/d-kimuson/claude-code-viewer/compare/v0.0.1...0.0.6)
