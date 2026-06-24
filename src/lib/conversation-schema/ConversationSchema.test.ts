import { describe, expect, test } from "vitest";
import { ConversationSchema } from "./index.ts";

describe("ConversationSchema", () => {
  test("accepts ai-title entries", () => {
    const data = ConversationSchema.parse({
      type: "ai-title",
      aiTitle: "macro-dashboard のフォントと UI デザイン修正",
      sessionId: "379ea227-4913-484f-9a55-fc76a9fc215f",
    });

    if (data.type !== "ai-title") {
      throw new Error("Expected ai-title entry");
    }
    expect(data.aiTitle).toBe("macro-dashboard のフォントと UI デザイン修正");
  });

  test("accepts away_summary system entries with entrypoint and slug", () => {
    const data = ConversationSchema.parse({
      parentUuid: "bde9c218-c40b-4d1c-9f2d-643d5fb22bc9",
      isSidechain: false,
      type: "system",
      subtype: "away_summary",
      content:
        "Building `sb`, a Swift CLI replacing your `sb` + `dm` scripts; `PLAN.md` is written with 6 phases. Next: start Phase 0, the Makefile and Swift scaffolding. (disable recaps in /config)",
      timestamp: "2026-04-21T12:22:43.974Z",
      uuid: "1db9cd52-9a46-4172-8ec9-df8b9c416ed4",
      isMeta: false,
      userType: "external",
      entrypoint: "cli",
      cwd: "/path/to/project/here",
      sessionId: "4dbd4176-6757-48e0-bdde-026de415f8fa",
      version: "2.1.116",
      gitBranch: "main",
      slug: "temporal-twirling-plum",
    });

    if (data.type !== "system") {
      throw new Error("Expected system entry");
    }
    expect(data.entrypoint).toBe("cli");
    expect(data.slug).toBe("temporal-twirling-plum");
  });

  test("accepts assistant usage fields emitted by non-Anthropic providers", () => {
    const data = ConversationSchema.parse({
      parentUuid: "8f9e1331-6298-4da4-837a-d4df6ba8e3b7",
      isSidechain: false,
      message: {
        model: "kimi-k2.5",
        id: "msg_79158e71-574d-494c-9e98-91a9d802a076",
        role: "assistant",
        type: "message",
        content: [
          {
            name: "Bash",
            input: {
              command: "ls -lh test-document.docx && rm create-doc.js",
              description: "Verify document exists and cleanup script",
            },
            id: "toolu_functions.Bash:6",
            type: "tool_use",
          },
        ],
        usage: {
          input_tokens: 4,
          cache_creation_input_tokens: 180,
          cache_read_input_tokens: 39242,
          output_tokens: 62,
          server_tool_use: {
            web_search_requests: 0,
            web_fetch_requests: 0,
          },
          service_tier: "standard",
          cache_creation: {
            ephemeral_1h_input_tokens: 0,
            ephemeral_5m_input_tokens: 180,
          },
          inference_geo: "",
          iterations: [],
          speed: "standard",
        },
        stop_reason: "tool_use",
      },
      type: "assistant",
      uuid: "668d7ff4-0fa0-4a5b-9231-a381aab58fd6",
      timestamp: "2026-04-10T02:29:29.982Z",
      userType: "external",
      entrypoint: "sdk-cli",
      cwd: "/Users/zhoudi/Projects/GitHub/ClaudeAssistant",
      sessionId: "163cbdad-1134-4111-afc8-56056143a581",
      version: "2.1.98",
      gitBranch: "main",
      slug: "harmonic-snacking-mccarthy",
    });

    if (data.type !== "assistant") {
      throw new Error("Expected assistant entry");
    }
    expect(data.message.usage?.server_tool_use?.web_fetch_requests).toBe(0);
    expect(data.message.usage?.inference_geo).toBe("");
    expect(data.message.usage?.speed).toBe("standard");
  });

  test("accepts compact file reference attachments", () => {
    const result = ConversationSchema.safeParse({
      parentUuid: "8e7b736e-08dc-477c-b515-0bc9cf2df8fb",
      isSidechain: false,
      attachment: {
        type: "compact_file_reference",
        filename: "/path/to/project/src/a.c",
        displayPath: "src/a.c",
      },
      type: "attachment",
      uuid: "c6f7796c-49e1-488a-ae65-bd95323489b2",
      timestamp: "2026-04-10T16:52:50.109Z",
      userType: "external",
      entrypoint: "cli",
      cwd: "/path/to/project",
      sessionId: "2825293e-3ecd-470e-82de-681376a273a0",
      version: "2.1.100",
      gitBranch: "main",
      slug: "cozy-booping-sky",
    });

    expect(result.success).toBe(true);
  });

  test("accepts file attachments with inline text content", () => {
    const result = ConversationSchema.safeParse({
      parentUuid: "304e740c-4092-4899-9cbc-78856e2316d1",
      isSidechain: false,
      attachment: {
        type: "file",
        filename: "/path/to/project/tests/a.sh",
        content: {
          type: "text",
          file: {
            filePath: "/path/to/project/tests/a.sh",
            content:
              '#!/bin/bash\n# tests/a.sh — T6: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n\necho "$PASS passed, $FAIL failed"\n[ "$FAIL" -eq 0 ]\n',
            numLines: 50,
            startLine: 1,
            totalLines: 50,
          },
        },
        displayPath: "tests/a.sh",
      },
      type: "attachment",
      uuid: "42e88b33-d08f-4f3c-9fac-00278668ab98",
      timestamp: "2026-04-10T16:52:49.756Z",
      userType: "external",
      entrypoint: "cli",
      cwd: "/path/to/project",
      sessionId: "2825293e-3ecd-470e-82de-681376a273a0",
      version: "2.1.100",
      gitBranch: "main",
      slug: "cozy-booping-sky",
    });

    expect(result.success).toBe(true);
  });

  test("accepts last-prompt entries with leafUuid (#210)", () => {
    const data = ConversationSchema.parse({
      type: "last-prompt",
      leafUuid: "02e5eb93-f937-42d7-a944-d1b3eccdd414",
      sessionId: "55aa54f1-c57b-476c-be3a-e9aac3b0aa72",
    });
    if (data.type !== "last-prompt") {
      throw new Error("Expected last-prompt entry");
    }
    expect(data.leafUuid).toBe("02e5eb93-f937-42d7-a944-d1b3eccdd414");
  });

  test("accepts mode entries (#211)", () => {
    const data = ConversationSchema.parse({
      type: "mode",
      mode: "normal",
      sessionId: "3e3c611b-ebc9-42c2-a98a-344693a9a0d2",
    });
    if (data.type !== "mode") {
      throw new Error("Expected mode entry");
    }
    expect(data.mode).toBe("normal");
  });

  test("accepts bridge-session entries (#212)", () => {
    const data = ConversationSchema.parse({
      type: "bridge-session",
      sessionId: "fc90d874-4741-4500-9462-a6255cfff0fe",
      bridgeSessionId: "cse_011C66zkyVAdqvuayh7XGpto",
      lastSequenceNum: 0,
    });
    if (data.type !== "bridge-session") {
      throw new Error("Expected bridge-session entry");
    }
    expect(data.bridgeSessionId).toBe("cse_011C66zkyVAdqvuayh7XGpto");
  });

  test("accepts bridge_status system entries (#213)", () => {
    const result = ConversationSchema.safeParse({
      parentUuid: null,
      isSidechain: false,
      type: "system",
      subtype: "bridge_status",
      content:
        "/remote-control is active · Continue here, on your phone, or at https://claude.ai/code/session_0X0X0X0X0X0X0X0X0X0X0X0X",
      url: "https://claude.ai/code/session_0X0X0X0X0X0X0X0X0X0X0X0X",
      isMeta: false,
      timestamp: "2026-05-29T11:31:46.015Z",
      uuid: "bdc15df7-bf5a-4732-a51b-348e67975a2d",
      userType: "external",
      entrypoint: "cli",
      cwd: "/Users/rymalia/projects/standup",
      sessionId: "fc90d874-4741-4500-9462-a6255cfff0fe",
      version: "2.1.156",
      gitBranch: "main",
    });
    expect(result.success).toBe(true);
  });
});
