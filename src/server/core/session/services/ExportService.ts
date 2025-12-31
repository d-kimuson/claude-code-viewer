import { Effect } from "effect";
import type { Conversation } from "../../../../lib/conversation-schema";
import type { SessionDetail } from "../../types";

/**
 * Escapes HTML special characters to prevent XSS
 */
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] ?? char);
};

/**
 * Formats JSON with proper newlines instead of escaped \n characters
 */
const formatJsonWithNewlines = (obj: unknown): string => {
  const jsonString = JSON.stringify(obj, null, 2);

  // Replace escaped newlines, tabs, and carriage returns with actual characters
  return jsonString
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r");
};

/**
 * Formats timestamp to readable date string
 * Timestamps in the schema are stored as ISO 8601 strings
 */
const formatTimestamp = (timestamp: number | string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

/**
 * Renders markdown content to HTML (simplified version)
 */
const renderMarkdown = (content: string): string => {
  let html = escapeHtml(content);

  // Code blocks
  html = html.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_match, lang, code) => `
    <div class="code-block">
      ${lang ? `<div class="code-header"><span class="code-lang">${escapeHtml(lang.toUpperCase())}</span></div>` : ""}
      <pre><code class="language-${escapeHtml(lang || "text")}">${code.trim()}</code></pre>
    </div>
  `,
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="markdown-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="markdown-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="markdown-h1">$1</h1>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Paragraphs
  html = html
    .split("\n\n")
    .map((para) => {
      if (
        para.startsWith("<h") ||
        para.startsWith("<div") ||
        para.startsWith("<pre") ||
        para.trim() === ""
      ) {
        return para;
      }
      return `<p class="markdown-p">${para.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  return html;
};

/**
 * Renders a user message entry
 */
const renderUserEntry = (
  entry: Extract<Conversation, { type: "user" }>,
): string => {
  const contentArray = Array.isArray(entry.message.content)
    ? entry.message.content
    : [entry.message.content];

  const contentHtml = contentArray
    .map((msg) => {
      if (typeof msg === "string") {
        return `<div class="markdown-content">${renderMarkdown(msg)}</div>`;
      }
      if (msg.type === "text") {
        return `<div class="markdown-content">${renderMarkdown(msg.text)}</div>`;
      }
      if (msg.type === "image") {
        return `<img src="data:${msg.source.media_type};base64,${msg.source.data}" alt="User uploaded image" class="message-image" />`;
      }
      if (msg.type === "document") {
        return `<div class="document-content"><strong>Document:</strong> ${escapeHtml(msg.source.media_type)}</div>`;
      }
      if (msg.type === "tool_result") {
        // Skip tool results in user messages - they're shown in assistant message context
        return "";
      }
      return "";
    })
    .join("");

  // Skip rendering if there's no actual user content (only tool results)
  if (!contentHtml.trim()) {
    return "";
  }

  return `
    <div class="conversation-entry user-entry">
      <div class="entry-header">
        <span class="entry-role">User</span>
        <span class="entry-timestamp">${formatTimestamp(entry.timestamp)}</span>
      </div>
      <div class="entry-content">
        ${contentHtml}
      </div>
    </div>
  `;
};

/**
 * Renders an assistant message entry
 */
const renderAssistantEntry = (
  entry: Extract<Conversation, { type: "assistant" }>,
): string => {
  const contentHtml = entry.message.content
    .map((msg) => {
      if (msg.type === "text") {
        return `<div class="markdown-content">${renderMarkdown(msg.text)}</div>`;
      }

      if (msg.type === "thinking") {
        const charCount = msg.thinking.length;
        return `
          <div class="thinking-block collapsible">
            <div class="thinking-header collapsible-trigger">
              <svg class="icon-lightbulb" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v1m0 18v1m9-10h1M2 12H1m17.66-7.66l.71.71M3.63 20.37l.71.71m0-14.14l-.71.71m17.02 12.73l-.71.71M12 7a5 5 0 0 1 5 5 5 5 0 0 1-1.47 3.53c-.6.6-.94 1.42-.94 2.27V18a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-.2c0-.85-.34-1.67-.94-2.27A5 5 0 0 1 7 12a5 5 0 0 1 5-5Z"/>
              </svg>
              <span class="thinking-title">Thinking</span>
              <span class="expand-hint">(${charCount} characters · click to collapse)</span>
              <svg class="icon-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="thinking-content collapsible-content">
              <pre class="thinking-text">${escapeHtml(msg.thinking)}</pre>
            </div>
          </div>
        `;
      }

      if (msg.type === "tool_use") {
        const inputKeys = Object.keys(msg.input).length;
        return `
          <div class="tool-use-block collapsible">
            <div class="tool-use-header collapsible-trigger">
              <svg class="icon-wrench" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              <span class="tool-name">${escapeHtml(msg.name)}</span>
              <span class="expand-hint">(${inputKeys} parameter${inputKeys !== 1 ? "s" : ""} · click to collapse)</span>
              <svg class="icon-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="tool-use-content collapsible-content">
              <div class="tool-id"><strong>Tool ID:</strong> <code>${escapeHtml(msg.id)}</code></div>
              <div class="tool-input">
                <strong>Input Parameters:</strong>
                <pre class="json-input">${escapeHtml(formatJsonWithNewlines(msg.input))}</pre>
              </div>
            </div>
          </div>
        `;
      }

      return "";
    })
    .join("");

  return `
    <div class="conversation-entry assistant-entry">
      <div class="entry-header">
        <span class="entry-role">Assistant</span>
        <span class="entry-timestamp">${formatTimestamp(entry.timestamp)}</span>
      </div>
      <div class="entry-content">
        ${contentHtml}
      </div>
    </div>
  `;
};

/**
 * Gets the content to display for a system entry
 */
const getSystemEntryContent = (
  entry: Extract<Conversation, { type: "system" }>,
): string => {
  if ("content" in entry && typeof entry.content === "string") {
    return entry.content;
  }
  if ("subtype" in entry && entry.subtype === "stop_hook_summary") {
    const hookNames = entry.hookInfos.map((h) => h.command).join(", ");
    return `Stop hook executed: ${hookNames}`;
  }
  return "System message";
};

/**
 * Renders a system message entry
 */
const renderSystemEntry = (
  entry: Extract<Conversation, { type: "system" }>,
): string => {
  const content = getSystemEntryContent(entry);
  return `
    <div class="conversation-entry system-entry">
      <div class="entry-header">
        <span class="entry-role">System</span>
        <span class="entry-timestamp">${formatTimestamp(entry.timestamp)}</span>
      </div>
      <div class="entry-content">
        <div class="system-message">${escapeHtml(content)}</div>
      </div>
    </div>
  `;
};

/**
 * Groups consecutive assistant messages together
 */
const groupConsecutiveAssistantMessages = (
  conversations: SessionDetail["conversations"],
): Array<{
  type: "grouped" | "single";
  entries: Array<
    Extract<Conversation, { type: "assistant" | "user" | "system" }>
  >;
}> => {
  const grouped: Array<{
    type: "grouped" | "single";
    entries: Array<
      Extract<Conversation, { type: "assistant" | "user" | "system" }>
    >;
  }> = [];

  let currentGroup: Array<Extract<Conversation, { type: "assistant" }>> = [];

  for (const conv of conversations) {
    if (conv.type === "assistant") {
      // Add all consecutive assistant messages to the group
      currentGroup.push(conv);
    } else if (conv.type === "user" || conv.type === "system") {
      // End the current group when we hit a non-assistant message
      if (currentGroup.length > 0) {
        grouped.push({
          type: currentGroup.length > 1 ? "grouped" : "single",
          entries: currentGroup,
        });
        currentGroup = [];
      }
      grouped.push({ type: "single", entries: [conv] });
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    grouped.push({
      type: currentGroup.length > 1 ? "grouped" : "single",
      entries: currentGroup,
    });
  }

  return grouped;
};

/**
 * Renders a group of consecutive assistant tool calls
 */
const renderGroupedAssistantEntries = (
  entries: Array<Extract<Conversation, { type: "assistant" }>>,
): string => {
  const allContent = entries.flatMap((entry) => entry.message.content);
  const firstEntry = entries[0];

  if (!firstEntry) {
    return "";
  }

  const contentHtml = allContent
    .map((msg) => {
      if (msg.type === "text") {
        return `<div class="markdown-content">${renderMarkdown(msg.text)}</div>`;
      }

      if (msg.type === "thinking") {
        const charCount = msg.thinking.length;
        return `
          <div class="thinking-block collapsible">
            <div class="thinking-header collapsible-trigger">
              <svg class="icon-lightbulb" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v1m0 18v1m9-10h1M2 12H1m17.66-7.66l.71.71M3.63 20.37l.71.71m0-14.14l-.71.71m17.02 12.73l-.71.71M12 7a5 5 0 0 1 5 5 5 5 0 0 1-1.47 3.53c-.6.6-.94 1.42-.94 2.27V18a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-.2c0-.85-.34-1.67-.94-2.27A5 5 0 0 1 7 12a5 5 0 0 1 5-5Z"/>
              </svg>
              <span class="thinking-title">Thinking</span>
              <span class="expand-hint">(${charCount} characters · click to collapse)</span>
              <svg class="icon-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="thinking-content collapsible-content">
              <pre class="thinking-text">${escapeHtml(msg.thinking)}</pre>
            </div>
          </div>
        `;
      }

      if (msg.type === "tool_use") {
        const inputKeys = Object.keys(msg.input).length;
        return `
          <div class="tool-use-block collapsible">
            <div class="tool-use-header collapsible-trigger">
              <svg class="icon-wrench" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              <span class="tool-name">${escapeHtml(msg.name)}</span>
              <span class="expand-hint">(${inputKeys} parameter${inputKeys !== 1 ? "s" : ""} · click to collapse)</span>
              <svg class="icon-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="tool-use-content collapsible-content">
              <div class="tool-id"><strong>Tool ID:</strong> <code>${escapeHtml(msg.id)}</code></div>
              <div class="tool-input">
                <strong>Input Parameters:</strong>
                <pre class="json-input">${escapeHtml(formatJsonWithNewlines(msg.input))}</pre>
              </div>
            </div>
          </div>
        `;
      }

      return "";
    })
    .join("");

  return `
    <div class="conversation-entry assistant-entry">
      <div class="entry-header">
        <span class="entry-role">Assistant</span>
        <span class="entry-timestamp">${formatTimestamp(firstEntry.timestamp)}</span>
      </div>
      <div class="entry-content">
        ${contentHtml}
      </div>
    </div>
  `;
};

/**
 * Generates the full HTML document for a session export
 */
export const generateSessionHtml = (
  session: SessionDetail,
  projectId: string,
): Effect.Effect<string> =>
  Effect.gen(function* () {
    const grouped = groupConsecutiveAssistantMessages(session.conversations);

    const conversationsHtml = grouped
      .map((group) => {
        if (group.type === "grouped") {
          return renderGroupedAssistantEntries(
            group.entries as Array<
              Extract<Conversation, { type: "assistant" }>
            >,
          );
        }

        const conv = group.entries[0];
        if (!conv) {
          return "";
        }

        if (conv.type === "user") {
          return renderUserEntry(conv);
        }
        if (conv.type === "assistant") {
          return renderAssistantEntry(conv);
        }
        if (conv.type === "system") {
          return renderSystemEntry(conv);
        }
        return "";
      })
      .filter((html) => html !== "")
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Code Session - ${escapeHtml(session.id)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --background: 0 0% 100%;
      --foreground: 0 0% 3.9%;
      --muted: 0 0% 96.1%;
      --muted-foreground: 0 0% 45.1%;
      --border: 0 0% 89.8%;
      --primary: 0 0% 9%;
      --blue-50: 214 100% 97%;
      --blue-200: 213 97% 87%;
      --blue-600: 217 91% 60%;
      --blue-800: 217 91% 35%;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: hsl(var(--foreground));
      background: hsl(var(--background));
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      border-bottom: 1px solid hsl(var(--border));
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .header .metadata {
      color: hsl(var(--muted-foreground));
      font-size: 0.875rem;
    }

    .conversation-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .conversation-entry {
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-bottom: 1px solid;
    }

    .entry-timestamp {
      color: hsl(var(--muted-foreground));
      font-size: 0.75rem;
    }

    .entry-content {
      padding: 1.5rem;
    }

    /* User entry styles */
    .user-entry {
      background: hsl(var(--muted) / 0.3);
      border: 1px solid hsl(var(--border));
    }

    .user-entry .entry-header {
      background: hsl(var(--muted) / 0.5);
      border-bottom-color: hsl(var(--border));
    }

    /* Assistant entry styles */
    .assistant-entry {
      background: hsl(var(--background));
      border: 1px solid hsl(var(--border));
    }

    .assistant-entry .entry-header {
      background: hsl(var(--muted) / 0.3);
      border-bottom-color: hsl(var(--border));
    }

    /* System entry styles */
    .system-entry {
      background: hsl(var(--muted) / 0.2);
      border: 1px dashed hsl(var(--border));
    }

    .system-entry .entry-header {
      background: hsl(var(--muted) / 0.4);
      border-bottom-color: hsl(var(--border));
    }

    .system-message {
      font-family: monospace;
      font-size: 0.875rem;
      color: hsl(var(--muted-foreground));
    }

    /* Markdown styles */
    .markdown-content {
      width: 100%;
      margin: 1rem 0.25rem;
    }

    .markdown-h1 {
      font-size: 1.875rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      margin-top: 2rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid hsl(var(--border));
    }

    .markdown-h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      margin-top: 2rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid hsl(var(--border) / 0.5);
    }

    .markdown-h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      margin-top: 1.5rem;
    }

    .markdown-p {
      margin-bottom: 1rem;
      line-height: 1.75;
      word-break: break-all;
    }

    .inline-code {
      background: hsl(var(--muted) / 0.7);
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-family: monospace;
      border: 1px solid hsl(var(--border));
    }

    .code-block {
      position: relative;
      margin: 1.5rem 0;
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: hsl(var(--muted) / 0.3);
      padding: 0.5rem 1rem;
      border-bottom: 1px solid hsl(var(--border));
      border-top-left-radius: 0.5rem;
      border-top-right-radius: 0.5rem;
      border: 1px solid hsl(var(--border));
      border-bottom: none;
    }

    .code-lang {
      font-size: 0.75rem;
      font-weight: 500;
      color: hsl(var(--muted-foreground));
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .code-block pre {
      margin: 0;
      padding: 1rem;
      background: hsl(var(--muted) / 0.2);
      border: 1px solid hsl(var(--border));
      border-top: none;
      border-bottom-left-radius: 0.5rem;
      border-bottom-right-radius: 0.5rem;
      overflow-x: auto;
    }

    .code-block code {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    /* Thinking block styles */
    .thinking-block {
      background: hsl(var(--muted) / 0.5);
      border: 2px dashed hsl(var(--border));
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      overflow: hidden;
    }

    .thinking-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      background: hsl(var(--muted) / 0.3);
      transition: background 0.2s;
    }

    .thinking-header:hover {
      background: hsl(var(--muted) / 0.5);
    }

    .icon-lightbulb {
      color: hsl(var(--muted-foreground));
      flex-shrink: 0;
    }

    .thinking-title {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .expand-hint {
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));
      font-weight: normal;
      margin-left: 0.5rem;
    }

    .collapsible:not(.collapsed) .expand-hint {
      display: none;
    }

    .icon-chevron {
      margin-left: auto;
      color: hsl(var(--muted-foreground));
      transition: transform 0.2s;
    }

    .collapsible.collapsed .icon-chevron {
      transform: rotate(-90deg);
    }

    .thinking-content {
      padding: 0.5rem 1rem;
    }

    .collapsible-content {
      max-height: 1000px;
      overflow: hidden;
      transition: max-height 0.3s ease-out, opacity 0.2s ease-out;
    }

    .collapsible.collapsed .collapsible-content {
      max-height: 0;
      opacity: 0;
    }

    .thinking-text {
      font-size: 0.875rem;
      color: hsl(var(--muted-foreground));
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Tool use block styles */
    .tool-use-block {
      border: 1px solid hsl(var(--blue-200));
      background: hsl(var(--blue-50) / 0.5);
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      overflow: hidden;
    }

    .tool-use-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      cursor: pointer;
      background: hsl(var(--blue-50) / 0.3);
      transition: background 0.2s;
    }

    .tool-use-header:hover {
      background: hsl(var(--blue-50) / 0.6);
    }

    .icon-wrench {
      color: hsl(var(--blue-600));
      flex-shrink: 0;
    }

    .tool-name {
      font-size: 0.875rem;
      font-weight: 500;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tool-use-content {
      padding: 0.75rem 1rem;
      border-top: 1px solid hsl(var(--blue-200));
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .tool-id {
      font-size: 0.75rem;
    }

    .tool-id code {
      background: hsl(var(--background) / 0.5);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      border: 1px solid hsl(var(--blue-200));
      font-family: monospace;
      font-size: 0.75rem;
    }

    .tool-input {
      font-size: 0.75rem;
    }

    .json-input {
      background: hsl(var(--background));
      border: 1px solid hsl(var(--border));
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin-top: 0.5rem;
      overflow-x: auto;
      font-family: monospace;
      font-size: 0.75rem;
      white-space: pre-wrap;
      word-break: break-all;
      overflow-wrap: break-word;
    }

    .message-image {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
      margin: 1rem 0;
    }

    strong {
      font-weight: 600;
    }

    em {
      font-style: italic;
    }

    a {
      color: hsl(var(--primary));
      text-decoration: underline;
      text-decoration-color: hsl(var(--primary) / 0.3);
      text-underline-offset: 4px;
      transition: text-decoration-color 0.2s;
    }

    a:hover {
      text-decoration-color: hsl(var(--primary) / 0.6);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .toggle-all-button {
      padding: 0.5rem 1rem;
      background: hsl(var(--primary));
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .toggle-all-button:hover {
      opacity: 0.9;
    }

    .toggle-all-button:active {
      opacity: 0.8;
    }

    .footer {
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid hsl(var(--border));
      text-align: center;
      color: hsl(var(--muted-foreground));
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <h1>Claude Code Session Export</h1>
      <button id="toggle-all-btn" class="toggle-all-button">Collapse All</button>
    </div>
    <div class="metadata">
      <div><strong>Session ID:</strong> ${escapeHtml(session.id)}</div>
      <div><strong>Project ID:</strong> ${escapeHtml(projectId)}</div>
      <div><strong>Exported:</strong> ${formatTimestamp(Date.now())}</div>
      <div><strong>Total Conversations:</strong> ${session.conversations.length}</div>
    </div>
  </div>

  <div class="conversation-list">
    ${conversationsHtml}
  </div>

  <div class="footer">
    <p>Exported from Claude Code Viewer</p>
  </div>

  <script>
    // Add click handlers for collapsible blocks
    document.addEventListener('DOMContentLoaded', function() {
      const triggers = document.querySelectorAll('.collapsible-trigger');
      const toggleAllBtn = document.getElementById('toggle-all-btn');
      let allExpanded = true; // Start as expanded since blocks are expanded by default

      // Individual collapsible click handlers
      triggers.forEach(function(trigger) {
        trigger.addEventListener('click', function() {
          const collapsible = this.closest('.collapsible');
          if (collapsible) {
            collapsible.classList.toggle('collapsed');
          }
        });
      });

      // Toggle all button
      if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', function() {
          const collapsibles = document.querySelectorAll('.collapsible');

          if (allExpanded) {
            // Collapse all
            collapsibles.forEach(function(collapsible) {
              collapsible.classList.add('collapsed');
            });
            toggleAllBtn.textContent = 'Expand All';
            allExpanded = false;
          } else {
            // Expand all
            collapsibles.forEach(function(collapsible) {
              collapsible.classList.remove('collapsed');
            });
            toggleAllBtn.textContent = 'Collapse All';
            allExpanded = true;
          }
        });
      }
    });
  </script>
</body>
</html>`;

    return html;
  });
