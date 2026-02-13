import { Effect } from "effect";
import type { Conversation } from "../../../../lib/conversation-schema";
import type { ToolResultContent } from "../../../../lib/conversation-schema/content/ToolResultContentSchema";
import type { IAgentSessionRepository } from "../../agent-session/infrastructure/AgentSessionRepository";
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
 * Renders markdown content to HTML (enhanced version)
 * Supports: code blocks, tables, blockquotes, lists (ul/ol/task), hr, strikethrough,
 * inline code, bold, italic, headers, links, paragraphs
 */
const renderMarkdown = (content: string): string => {
  // First, extract code blocks to protect them from other processing
  const codeBlocks: string[] = [];
  let processedContent = content.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_match, lang, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(`
    <div class="code-block">
      ${lang ? `<div class="code-header"><span class="code-lang">${escapeHtml(lang.toUpperCase())}</span></div>` : ""}
      <pre><code class="language-${escapeHtml(lang || "text")}">${escapeHtml(code.trim())}</code></pre>
    </div>
  `);
      return placeholder;
    },
  );

  // Process tables (before escaping HTML)
  processedContent = processedContent.replace(
    /(?:^\|.+\|$\n?)+/gm,
    (tableBlock) => {
      const rows = tableBlock.trim().split("\n");
      if (rows.length < 2) return escapeHtml(tableBlock);

      const headerRow = rows[0];
      const separatorRow = rows[1];

      // Check if second row is a separator (contains only |, -, :, and spaces)
      if (
        !headerRow ||
        !separatorRow ||
        !/^\|[\s\-:|]+\|$/.test(separatorRow)
      ) {
        return escapeHtml(tableBlock);
      }

      const parseRow = (row: string): string[] =>
        row
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim());

      const headerCells = parseRow(headerRow);
      const dataRows = rows.slice(2);

      let tableHtml = '<table class="markdown-table"><thead><tr>';
      for (const cell of headerCells) {
        tableHtml += `<th>${escapeHtml(cell)}</th>`;
      }
      tableHtml += "</tr></thead><tbody>";

      for (const row of dataRows) {
        const cells = parseRow(row);
        tableHtml += "<tr>";
        for (const cell of cells) {
          tableHtml += `<td>${escapeHtml(cell)}</td>`;
        }
        tableHtml += "</tr>";
      }
      tableHtml += "</tbody></table>";

      return tableHtml;
    },
  );

  // Escape HTML for remaining content (except already processed tables)
  // We need to escape only non-processed parts
  processedContent = processedContent
    .split(
      /(<table class="markdown-table">[\s\S]*?<\/table>|__CODE_BLOCK_\d+__)/,
    )
    .map((part) => {
      if (
        part.startsWith('<table class="markdown-table">') ||
        /^__CODE_BLOCK_\d+__$/.test(part)
      ) {
        return part;
      }
      return escapeHtml(part);
    })
    .join("");

  // Blockquotes (multi-line support)
  processedContent = processedContent.replace(
    /(?:^&gt; .+$\n?)+/gm,
    (quoteBlock) => {
      const lines = quoteBlock
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => l.replace(/^&gt; /, ""))
        .join("<br>");
      return `<blockquote class="markdown-blockquote">${lines}</blockquote>`;
    },
  );

  // Horizontal rule
  processedContent = processedContent.replace(
    /^(\*{3,}|-{3,}|_{3,})$/gm,
    '<hr class="markdown-hr">',
  );

  // Task lists (must be before regular lists)
  processedContent = processedContent.replace(
    /(?:^- \[([ xX])\] .+$\n?)+/gm,
    (listBlock) => {
      const items = listBlock
        .trim()
        .split("\n")
        .map((line) => {
          const match = line.match(/^- \[([ xX])\] (.+)$/);
          if (match?.[1] !== undefined && match[2] !== undefined) {
            const checked = match[1].toLowerCase() === "x";
            return `<li class="task-item"><input type="checkbox" class="task-checkbox" ${checked ? "checked" : ""} disabled>${match[2]}</li>`;
          }
          return "";
        })
        .join("");
      return `<ul class="markdown-task-list">${items}</ul>`;
    },
  );

  // Unordered lists
  processedContent = processedContent.replace(
    /(?:^[-*+] .+$\n?)+/gm,
    (listBlock) => {
      const items = listBlock
        .trim()
        .split("\n")
        .map((line) => {
          const match = line.match(/^[-*+] (.+)$/);
          return match ? `<li>${match[1]}</li>` : "";
        })
        .join("");
      return `<ul class="markdown-ul">${items}</ul>`;
    },
  );

  // Ordered lists
  processedContent = processedContent.replace(
    /(?:^\d+\. .+$\n?)+/gm,
    (listBlock) => {
      const items = listBlock
        .trim()
        .split("\n")
        .map((line) => {
          const match = line.match(/^\d+\. (.+)$/);
          return match ? `<li>${match[1]}</li>` : "";
        })
        .join("");
      return `<ol class="markdown-ol">${items}</ol>`;
    },
  );

  // Strikethrough
  processedContent = processedContent.replace(
    /~~(.+?)~~/g,
    '<del class="markdown-del">$1</del>',
  );

  // Inline code
  processedContent = processedContent.replace(
    /`([^`]+)`/g,
    '<code class="inline-code">$1</code>',
  );

  // Bold
  processedContent = processedContent.replace(
    /\*\*(.+?)\*\*/g,
    "<strong>$1</strong>",
  );

  // Italic (avoiding conflict with bold)
  processedContent = processedContent.replace(
    /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
    "<em>$1</em>",
  );

  // Headers
  processedContent = processedContent.replace(
    /^### (.+)$/gm,
    '<h3 class="markdown-h3">$1</h3>',
  );
  processedContent = processedContent.replace(
    /^## (.+)$/gm,
    '<h2 class="markdown-h2">$1</h2>',
  );
  processedContent = processedContent.replace(
    /^# (.+)$/gm,
    '<h1 class="markdown-h1">$1</h1>',
  );

  // Links (already escaped, so we look for escaped version)
  processedContent = processedContent.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Paragraphs - process remaining text blocks
  const blockElements = [
    "<h1",
    "<h2",
    "<h3",
    "<div",
    "<pre",
    "<table",
    "<ul",
    "<ol",
    "<blockquote",
    "<hr",
    "__CODE_BLOCK_",
  ];
  processedContent = processedContent
    .split("\n\n")
    .map((para) => {
      const trimmed = para.trim();
      if (trimmed === "") return "";
      if (blockElements.some((tag) => trimmed.startsWith(tag))) {
        return para;
      }
      return `<p class="markdown-p">${para.replace(/\n/g, "<br>")}</p>`;
    })
    .filter((p) => p !== "")
    .join("\n");

  // Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    const codeBlock = codeBlocks[i];
    if (codeBlock !== undefined) {
      processedContent = processedContent.replace(
        `__CODE_BLOCK_${i}__`,
        codeBlock,
      );
    }
  }

  return processedContent;
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
 * Type for tool result map
 */
type ToolResultMap = Map<string, ToolResultContent>;

/**
 * Renders tool result content
 */
const renderToolResultContent = (result: ToolResultContent): string => {
  const isError = result.is_error === true;
  const errorClass = isError ? " tool-result-error" : "";

  let contentHtml: string;
  if (typeof result.content === "string") {
    contentHtml = `<pre class="tool-result-text">${escapeHtml(result.content)}</pre>`;
  } else {
    contentHtml = result.content
      .map((item) => {
        if (item.type === "text") {
          return `<pre class="tool-result-text">${escapeHtml(item.text)}</pre>`;
        }
        if (item.type === "image") {
          return `<img src="data:${item.source.media_type};base64,${item.source.data}" alt="Tool result image" class="tool-result-image" />`;
        }
        return "";
      })
      .join("");
  }

  return `
    <div class="tool-result-block${errorClass}">
      <div class="tool-result-header">
        <svg class="icon-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${isError ? '<path d="M18 6L6 18M6 6l12 12"/>' : '<path d="M20 6L9 17l-5-5"/>'}
        </svg>
        <span class="tool-result-label">${isError ? "Error" : "Result"}</span>
      </div>
      <div class="tool-result-content">
        ${contentHtml}
      </div>
    </div>
  `;
};

/**
 * Sidechain data structure - matches frontend useSidechain logic
 */
type SidechainData = {
  // Map from root uuid to all conversations in that sidechain
  groupsByRootUuid: Map<
    string,
    Array<Extract<Conversation, { type: "user" | "assistant" | "system" }>>
  >;
  // Map from prompt string to root conversation
  promptToRoot: Map<
    string,
    Extract<Conversation, { type: "user" | "assistant" | "system" }>
  >;
  // Map from agentId to root conversation
  agentIdToRoot: Map<
    string,
    Extract<Conversation, { type: "user" | "assistant" | "system" }>
  >;
  // Map from tool_use_id to agentId (extracted from toolUseResult)
  toolUseIdToAgentId: Map<string, string>;
};

/**
 * Type guard to check if toolUseResult contains agentId
 */
const hasAgentId = (
  toolUseResult: unknown,
): toolUseResult is { agentId: string } => {
  return (
    typeof toolUseResult === "object" &&
    toolUseResult !== null &&
    "agentId" in toolUseResult &&
    typeof (toolUseResult as { agentId: unknown }).agentId === "string"
  );
};

/**
 * Builds sidechain data structures matching frontend useSidechain logic
 */
const buildSidechainData = (
  conversations: Array<Conversation>,
): SidechainData => {
  // Filter sidechain conversations
  const sidechainConversations = conversations.filter(
    (conv) =>
      conv.type !== "summary" &&
      conv.type !== "file-history-snapshot" &&
      conv.type !== "queue-operation" &&
      conv.type !== "progress" &&
      conv.type !== "custom-title" &&
      conv.type !== "agent-name" &&
      conv.isSidechain === true,
  ) as Array<Extract<Conversation, { type: "user" | "assistant" | "system" }>>;

  // Build uuid -> conversation map for parent lookup
  const uuidMap = new Map(
    sidechainConversations.map((conv) => [conv.uuid, conv] as const),
  );

  // Find root conversation for each sidechain conversation
  const getRootConversation = (
    conv: Extract<Conversation, { type: "user" | "assistant" | "system" }>,
  ): Extract<Conversation, { type: "user" | "assistant" | "system" }> => {
    if (conv.parentUuid === null) {
      return conv;
    }
    const parent = uuidMap.get(conv.parentUuid);
    if (parent === undefined) {
      return conv;
    }
    return getRootConversation(parent);
  };

  // Group by root conversation's uuid (matching frontend logic)
  const groupsByRootUuid = new Map<
    string,
    Array<Extract<Conversation, { type: "user" | "assistant" | "system" }>>
  >();
  for (const conv of sidechainConversations) {
    const root = getRootConversation(conv);
    const existing = groupsByRootUuid.get(root.uuid);
    if (existing) {
      existing.push(conv);
    } else {
      groupsByRootUuid.set(root.uuid, [conv]);
    }
  }

  // Sort each group by timestamp to ensure correct order
  for (const [, convs] of groupsByRootUuid) {
    convs.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }

  // Build prompt -> root mapping (for root user messages with string content)
  const promptToRoot = new Map<
    string,
    Extract<Conversation, { type: "user" | "assistant" | "system" }>
  >();
  for (const conv of sidechainConversations) {
    if (
      conv.type === "user" &&
      conv.parentUuid === null &&
      typeof conv.message.content === "string"
    ) {
      promptToRoot.set(conv.message.content, conv);
    }
  }

  // Build agentId -> root mapping
  const agentIdToRoot = new Map<
    string,
    Extract<Conversation, { type: "user" | "assistant" | "system" }>
  >();
  for (const conv of sidechainConversations) {
    if (conv.parentUuid === null && conv.agentId !== undefined) {
      agentIdToRoot.set(conv.agentId, conv);
    }
  }

  // Build tool_use_id -> agentId mapping from ALL user messages (not just sidechain)
  // This is the critical mapping that links Task tool calls to their subagent sessions
  const toolUseIdToAgentId = new Map<string, string>();
  for (const conv of conversations) {
    if (
      conv.type === "summary" ||
      conv.type === "file-history-snapshot" ||
      conv.type === "queue-operation" ||
      conv.type === "progress"
    ) {
      continue;
    }
    if (conv.type !== "user") continue;
    const messageContent = conv.message.content;
    if (typeof messageContent === "string") continue;

    for (const content of messageContent) {
      if (typeof content === "string") continue;
      if (content.type === "tool_result") {
        const toolUseResult = conv.toolUseResult;
        if (hasAgentId(toolUseResult)) {
          toolUseIdToAgentId.set(content.tool_use_id, toolUseResult.agentId);
        }
      }
    }
  }

  return { groupsByRootUuid, promptToRoot, agentIdToRoot, toolUseIdToAgentId };
};

/**
 * Renders a single sidechain conversation entry (for nested display)
 */
const renderSidechainEntry = (
  entry: Extract<Conversation, { type: "user" | "assistant" | "system" }>,
  toolResultMap: ToolResultMap,
  sidechainData: SidechainData,
): string => {
  if (entry.type === "user") {
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
        if (msg.type === "tool_result") {
          return ""; // Skip tool results in user messages
        }
        return "";
      })
      .join("");

    if (!contentHtml.trim()) return "";

    return `
      <div class="sidechain-entry sidechain-user-entry">
        <div class="sidechain-entry-header">
          <span class="sidechain-role">User</span>
          <span class="sidechain-timestamp">${formatTimestamp(entry.timestamp)}</span>
        </div>
        <div class="sidechain-entry-content">${contentHtml}</div>
      </div>
    `;
  }

  if (entry.type === "assistant") {
    const contentHtml = entry.message.content
      .map((msg) => {
        if (msg.type === "text") {
          return `<div class="markdown-content">${renderMarkdown(msg.text)}</div>`;
        }

        if (msg.type === "thinking") {
          const charCount = msg.thinking.length;
          return `
            <div class="thinking-block collapsible collapsed">
              <div class="thinking-header collapsible-trigger">
                <svg class="icon-lightbulb" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v1m0 18v1m9-10h1M2 12H1m17.66-7.66l.71.71M3.63 20.37l.71.71m0-14.14l-.71.71m17.02 12.73l-.71.71M12 7a5 5 0 0 1 5 5 5 5 0 0 1-1.47 3.53c-.6.6-.94 1.42-.94 2.27V18a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-.2c0-.85-.34-1.67-.94-2.27A5 5 0 0 1 7 12a5 5 0 0 1 5-5Z"/>
                </svg>
                <span class="thinking-title">Thinking</span>
                <span class="expand-hint">(${charCount} chars)</span>
                <svg class="icon-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          const toolResult = toolResultMap.get(msg.id);

          // Check if this is a nested Task tool (recursive subagent)
          if (msg.name === "Task") {
            return renderTaskTool(
              msg.id,
              msg.input,
              toolResult,
              sidechainData,
              toolResultMap,
            );
          }

          const inputKeys = Object.keys(msg.input).length;
          const toolResultHtml = toolResult
            ? renderToolResultContent(toolResult)
            : "";

          return `
            <div class="tool-use-block collapsible collapsed">
              <div class="tool-use-header collapsible-trigger">
                <svg class="icon-wrench" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                <span class="tool-name">${escapeHtml(msg.name)}</span>
                <span class="expand-hint">(${inputKeys} params)</span>
                <svg class="icon-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div class="tool-use-content collapsible-content">
                <div class="tool-id"><strong>Tool ID:</strong> <code>${escapeHtml(msg.id)}</code></div>
                <div class="tool-input">
                  <strong>Input:</strong>
                  <pre class="json-input">${escapeHtml(formatJsonWithNewlines(msg.input))}</pre>
                </div>
                ${toolResultHtml}
              </div>
            </div>
          `;
        }

        return "";
      })
      .join("");

    return `
      <div class="sidechain-entry sidechain-assistant-entry">
        <div class="sidechain-entry-header">
          <span class="sidechain-role">Subagent</span>
          <span class="sidechain-timestamp">${formatTimestamp(entry.timestamp)}</span>
        </div>
        <div class="sidechain-entry-content">${contentHtml}</div>
      </div>
    `;
  }

  if (entry.type === "system") {
    const content =
      "content" in entry && typeof entry.content === "string"
        ? entry.content
        : "System message";
    return `
      <div class="sidechain-entry sidechain-system-entry">
        <div class="sidechain-entry-header">
          <span class="sidechain-role">System</span>
          <span class="sidechain-timestamp">${formatTimestamp(entry.timestamp)}</span>
        </div>
        <div class="sidechain-entry-content">
          <div class="system-message">${escapeHtml(content)}</div>
        </div>
      </div>
    `;
  }

  return "";
};
/**
 * Renders a Task tool specially with prompt display and subagent conversations
 */
const renderTaskTool = (
  toolId: string,
  input: Record<string, unknown>,
  toolResult: ToolResultContent | undefined,
  sidechainData: SidechainData,
  toolResultMap: ToolResultMap,
): string => {
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  const truncatedPrompt =
    prompt.length > 200 ? `${prompt.slice(0, 200)}...` : prompt;

  // Find sidechain conversations using the new data structure
  let sidechainConversations: Array<
    Extract<Conversation, { type: "user" | "assistant" | "system" }>
  > = [];

  // 1. Try to find by agentId (from tool use result)
  const agentId = sidechainData.toolUseIdToAgentId.get(toolId);
  if (agentId) {
    const rootByAgentId = sidechainData.agentIdToRoot.get(agentId);
    if (rootByAgentId) {
      const convs = sidechainData.groupsByRootUuid.get(rootByAgentId.uuid);
      if (convs) {
        sidechainConversations = convs;
      }
    }
  }

  // 2. Fallback: Try to find by prompt
  if (sidechainConversations.length === 0) {
    const rootConversation = sidechainData.promptToRoot.get(prompt);
    if (rootConversation) {
      const convs = sidechainData.groupsByRootUuid.get(rootConversation.uuid);
      if (convs) {
        sidechainConversations = convs;
      }
    }
  }

  const hasSidechain = sidechainConversations.length > 0;
  const sidechainHtml = hasSidechain
    ? `
      <div class="sidechain-container collapsible">
        <div class="sidechain-header collapsible-trigger">
          <svg class="icon-layers" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
          <span>Subagent Work Log (${sidechainConversations.length} entries)</span>
          <svg class="icon-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="sidechain-content collapsible-content">
          ${sidechainConversations
            .map((conv) =>
              renderSidechainEntry(conv, toolResultMap, sidechainData),
            )
            .filter((html) => html !== "")
            .join("\n")}
        </div>
      </div>
    `
    : "";

  return `
    <div class="task-tool-block collapsible">
      <div class="task-tool-header collapsible-trigger">
        <svg class="icon-task" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span class="task-tool-name">Task${hasSidechain ? ` (${sidechainConversations.length} steps)` : ""}</span>
        <span class="task-prompt-preview">${escapeHtml(truncatedPrompt)}</span>
        <svg class="icon-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <div class="task-tool-content collapsible-content">
        <div class="task-tool-id"><strong>Task ID:</strong> <code>${escapeHtml(toolId)}</code></div>
        <div class="task-prompt">
          <strong>Prompt:</strong>
          <div class="task-prompt-text">${renderMarkdown(prompt)}</div>
        </div>
        ${toolResult ? renderToolResultContent(toolResult) : ""}
        ${sidechainHtml}
      </div>
    </div>
  `;
};

/**
 * Renders an assistant message entry
 */
const renderAssistantEntry = (
  entry: Extract<Conversation, { type: "assistant" }>,
  toolResultMap: ToolResultMap,
  sidechainData: SidechainData,
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
        const toolResult = toolResultMap.get(msg.id);

        // Special rendering for Task tool
        if (msg.name === "Task") {
          return renderTaskTool(
            msg.id,
            msg.input,
            toolResult,
            sidechainData,
            toolResultMap,
          );
        }

        const inputKeys = Object.keys(msg.input).length;
        const toolResultHtml = toolResult
          ? renderToolResultContent(toolResult)
          : "";

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
              ${toolResultHtml}
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
  toolResultMap: ToolResultMap,
  sidechainData: SidechainData,
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
        const toolResult = toolResultMap.get(msg.id);

        // Special rendering for Task tool
        if (msg.name === "Task") {
          return renderTaskTool(
            msg.id,
            msg.input,
            toolResult,
            sidechainData,
            toolResultMap,
          );
        }

        const inputKeys = Object.keys(msg.input).length;
        const toolResultHtml = toolResult
          ? renderToolResultContent(toolResult)
          : "";

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
              ${toolResultHtml}
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
  agentSessionRepo: IAgentSessionRepository,
): Effect.Effect<string, Error> =>
  Effect.gen(function* () {
    // Identify all agentIds from tool usage in the main session
    const agentIds = new Set<string>();

    for (const conv of session.conversations) {
      if (conv.type !== "user" || typeof conv.message.content === "string") {
        continue;
      }

      for (const content of conv.message.content) {
        if (typeof content === "string") continue;
        if (content.type === "tool_result") {
          const toolUseResult = conv.toolUseResult;
          if (hasAgentId(toolUseResult)) {
            agentIds.add(toolUseResult.agentId);
          }
        }
      }
    }

    // Check which agentIds are already present in the session (legacy format)
    const existingAgentIds = new Set<string>();
    for (const conv of session.conversations) {
      if (conv.type === "x-error") continue;
      if (
        conv.type !== "summary" &&
        conv.type !== "file-history-snapshot" &&
        conv.type !== "queue-operation" &&
        conv.type !== "progress" &&
        conv.type !== "custom-title" &&
        conv.type !== "agent-name" &&
        conv.isSidechain === true &&
        conv.agentId !== undefined
      ) {
        existingAgentIds.add(conv.agentId);
      }
    }

    // Determine missing agentIds
    const missingAgentIds = Array.from(agentIds).filter(
      (id) => !existingAgentIds.has(id),
    );

    // Load missing agent sessions
    const loadedConversations: Conversation[] = [];

    if (missingAgentIds.length > 0) {
      // Load concurrently
      const loadedSessions = yield* Effect.all(
        missingAgentIds.map((agentId) =>
          agentSessionRepo.getAgentSessionByAgentId(
            projectId,
            agentId,
            session.id,
          ),
        ),
        { concurrency: 5 },
      );

      for (const sess of loadedSessions) {
        if (sess) {
          // Verify items are valid conversations (filter out unknowns if any)
          const validConvs = sess.filter(
            (c): c is Conversation =>
              c.type === "user" ||
              c.type === "assistant" ||
              c.type === "system",
          );
          loadedConversations.push(
            ...validConvs.map((c) => ({
              ...c,
              isSidechain: true, // Ensure they are marked as sidechain
            })),
          );
        }
      }
    }

    // Combine all conversations for data building
    const allConversations = [
      ...session.conversations.filter(
        (conv): conv is Conversation => conv.type !== "x-error",
      ),
      ...loadedConversations,
    ];

    // Build sidechain data using ALL conversations
    const sidechainData = buildSidechainData(allConversations);

    // Build tool result map from user messages (including loaded sidechain ones)
    const toolResultMap: ToolResultMap = new Map();
    for (const conv of allConversations) {
      // Skip non-conversation types
      if (
        conv.type === "summary" ||
        conv.type === "file-history-snapshot" ||
        conv.type === "queue-operation" ||
        conv.type === "progress"
      ) {
        continue;
      }
      if (conv.type !== "user") continue;
      const content = conv.message.content;
      if (typeof content === "string") continue;
      for (const msg of content) {
        if (typeof msg === "string") continue;
        if (msg.type === "tool_result") {
          toolResultMap.set(msg.tool_use_id, msg);
        }
      }
    }

    const grouped = groupConsecutiveAssistantMessages(session.conversations);

    const conversationsHtml = grouped
      .map((group) => {
        if (group.type === "grouped") {
          return renderGroupedAssistantEntries(
            group.entries as Array<
              Extract<Conversation, { type: "assistant" }>
            >,
            toolResultMap,
            sidechainData,
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
          return renderAssistantEntry(conv, toolResultMap, sidechainData);
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
      word-break: break-word;
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

    /* Enhanced Markdown Styles */
    .markdown-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 0.875rem;
    }

    .markdown-table th,
    .markdown-table td {
      border: 1px solid hsl(var(--border));
      padding: 0.5rem 0.75rem;
      text-align: left;
    }

    .markdown-table th {
      background: hsl(var(--muted) / 0.5);
      font-weight: 600;
    }

    .markdown-table tr:nth-child(even) {
      background: hsl(var(--muted) / 0.2);
    }

    .markdown-blockquote {
      border-left: 4px solid hsl(var(--blue-600));
      padding: 0.75rem 1rem;
      margin: 1rem 0;
      background: hsl(var(--muted) / 0.3);
      color: hsl(var(--muted-foreground));
      font-style: italic;
    }

    .markdown-ul,
    .markdown-ol {
      margin: 1rem 0;
      padding-left: 1.5rem;
    }

    .markdown-ul li,
    .markdown-ol li {
      margin-bottom: 0.25rem;
      line-height: 1.6;
    }

    .markdown-task-list {
      list-style: none;
      padding-left: 0;
      margin: 1rem 0;
    }

    .task-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .task-checkbox {
      margin-top: 0.25rem;
      width: 1rem;
      height: 1rem;
      accent-color: hsl(var(--blue-600));
    }

    .markdown-hr {
      border: none;
      border-top: 2px solid hsl(var(--border));
      margin: 2rem 0;
    }

    .markdown-del {
      text-decoration: line-through;
      color: hsl(var(--muted-foreground));
    }

    /* Tool Result Styles */
    .tool-result-block {
      margin-top: 0.75rem;
      border: 1px solid hsl(var(--border));
      border-radius: 0.375rem;
      overflow: scroll;
    }

    .tool-result-error {
      border-color: hsl(0 84% 60%);
    }

    .tool-result-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      background: hsl(var(--muted) / 0.3);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .tool-result-error .tool-result-header {
      background: hsl(0 84% 60% / 0.1);
      color: hsl(0 84% 40%);
    }

    .icon-check {
      flex-shrink: 0;
      color: hsl(142 76% 36%);
    }

    .tool-result-error .icon-check {
      color: hsl(0 84% 60%);
    }

    .tool-result-label {
      font-weight: 500;
    }

    .tool-result-content {
      padding: 0.75rem;
      background: hsl(var(--background));
    }

    .tool-result-text {
      font-family: monospace;
      font-size: 0.75rem;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
      margin: 0;
    }

    .tool-result-image {
      max-width: 100%;
      height: auto;
      border-radius: 0.25rem;
    }

    /* Task Tool Styles */
    .task-tool-block {
      border: 1px solid hsl(142 76% 36% / 0.3);
      background: hsl(142 76% 36% / 0.05);
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      overflow: hidden;
    }

    .task-tool-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      background: hsl(142 76% 36% / 0.1);
      transition: background 0.2s;
    }

    .task-tool-header:hover {
      background: hsl(142 76% 36% / 0.15);
    }

    .icon-task {
      color: hsl(142 76% 36%);
      flex-shrink: 0;
    }

    .task-tool-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: hsl(142 76% 30%);
    }

    .task-prompt-preview {
      flex: 1;
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .task-tool-content {
      padding: 0.75rem 1rem;
      border-top: 1px solid hsl(142 76% 36% / 0.2);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .task-tool-id {
      font-size: 0.75rem;
    }

    .task-tool-id code {
      background: hsl(var(--background) / 0.5);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      border: 1px solid hsl(142 76% 36% / 0.2);
      font-family: monospace;
      font-size: 0.75rem;
    }

    .task-prompt {
      font-size: 0.875rem;
    }

    .task-prompt-text {
      background: hsl(var(--background));
      border: 1px solid hsl(var(--border));
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin-top: 0.5rem;
    }

    /* Sidechain / Subagent Styles */
    .sidechain-container {
      margin-top: 1rem;
      border: 1px solid hsl(217 91% 60% / 0.3);
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .sidechain-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: hsl(217 91% 60% / 0.1);
      color: hsl(217 91% 40%);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
    }

    .sidechain-header:hover {
      background: hsl(217 91% 60% / 0.15);
    }

    .icon-layers {
      flex-shrink: 0;
    }

    .sidechain-content {
      padding: 0.75rem;
      background: hsl(217 91% 60% / 0.02);
      border-top: 1px solid hsl(217 91% 60% / 0.2);
    }

    .sidechain-entry {
      margin-left: 1rem;
      padding: 0.5rem 0.75rem;
      border-left: 2px solid hsl(217 91% 60% / 0.3);
      margin-bottom: 0.5rem;
    }

    .sidechain-entry:last-child {
      margin-bottom: 0;
    }

    .sidechain-entry-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
      font-size: 0.75rem;
    }

    .sidechain-role {
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }

    .sidechain-user-entry .sidechain-role {
      background: hsl(var(--muted));
      color: hsl(var(--foreground));
    }

    .sidechain-assistant-entry .sidechain-role {
      background: hsl(217 91% 60% / 0.1);
      color: hsl(217 91% 40%);
    }

    .sidechain-system-entry .sidechain-role {
      background: hsl(var(--muted) / 0.5);
      color: hsl(var(--muted-foreground));
    }

    .sidechain-timestamp {
      color: hsl(var(--muted-foreground));
    }

    .sidechain-entry-content {
      font-size: 0.875rem;
    }

    .sidechain-entry .thinking-block,
    .sidechain-entry .tool-use-block {
      margin: 0.5rem 0;
      font-size: 0.8rem;
    }

    .sidechain-entry .thinking-header,
    .sidechain-entry .tool-use-header {
      padding: 0.375rem 0.5rem;
    }

    .sidechain-entry .thinking-content,
    .sidechain-entry .tool-use-content {
      padding: 0.5rem;
    }

    /* Optimize content display */
    .entry-content > *:first-child {
      margin-top: 0;
    }

    .entry-content > *:last-child {
      margin-bottom: 0;
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
