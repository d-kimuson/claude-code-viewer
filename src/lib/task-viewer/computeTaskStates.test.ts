import { describe, expect, test } from "vitest";
import type { ExtendedConversation } from "../../types/conversation";
import { computeTaskStates } from "./computeTaskStates";

const baseEntry = {
  isSidechain: false,
  userType: "external" as const,
  cwd: "/tmp",
  sessionId: "test-session",
  version: "1.0.0",
  uuid: "00000000-0000-0000-0000-000000000001",
  timestamp: "2025-01-01T00:00:00Z",
  parentUuid: null,
};

// Helper to create a minimal assistant entry with tool_use blocks
const makeAssistantEntry = (
  toolUses: readonly { id: string; name: string; input: Record<string, unknown> }[],
): ExtendedConversation => ({
  ...baseEntry,
  type: "assistant",
  message: {
    id: "msg-1",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-20250514",
    content: toolUses.map((tu) => ({
      type: "tool_use" as const,
      id: tu.id,
      name: tu.name,
      input: tu.input,
    })),
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  },
});

describe("computeTaskStates", () => {
  test("returns empty state for empty conversations", () => {
    const result = computeTaskStates([]);
    expect(result.stateByToolUseId.size).toBe(0);
    expect(result.latestTasks).toBeNull();
  });

  test("returns empty state for conversations without TaskCreate/TaskUpdate", () => {
    const conversations: readonly ExtendedConversation[] = [
      makeAssistantEntry([{ id: "tu-1", name: "Read", input: { file_path: "/tmp/test.ts" } }]),
    ];
    const result = computeTaskStates(conversations);
    expect(result.stateByToolUseId.size).toBe(0);
    expect(result.latestTasks).toBeNull();
  });

  test("handles a single TaskCreate", () => {
    const conversations: readonly ExtendedConversation[] = [
      makeAssistantEntry([
        {
          id: "tu-1",
          name: "TaskCreate",
          input: { subject: "Implement feature A", description: "Details about A" },
        },
      ]),
    ];

    const result = computeTaskStates(conversations);
    expect(result.stateByToolUseId.size).toBe(1);

    const snapshot = result.stateByToolUseId.get("tu-1");
    expect(snapshot).toEqual([
      {
        id: "1",
        subject: "Implement feature A",
        description: "Details about A",
        status: "pending",
      },
    ]);
    expect(result.latestTasks).toEqual(snapshot);
  });

  test("assigns sequential IDs to multiple TaskCreate calls", () => {
    const conversations: readonly ExtendedConversation[] = [
      makeAssistantEntry([
        { id: "tu-1", name: "TaskCreate", input: { subject: "Task one" } },
        { id: "tu-2", name: "TaskCreate", input: { subject: "Task two" } },
      ]),
    ];

    const result = computeTaskStates(conversations);
    expect(result.stateByToolUseId.size).toBe(2);

    const snapshot1 = result.stateByToolUseId.get("tu-1");
    expect(snapshot1).toEqual([
      { id: "1", subject: "Task one", description: undefined, status: "pending" },
    ]);

    const snapshot2 = result.stateByToolUseId.get("tu-2");
    expect(snapshot2).toEqual([
      { id: "1", subject: "Task one", description: undefined, status: "pending" },
      { id: "2", subject: "Task two", description: undefined, status: "pending" },
    ]);
  });

  test("handles TaskCreate followed by TaskUpdate", () => {
    const conversations: readonly ExtendedConversation[] = [
      makeAssistantEntry([{ id: "tu-1", name: "TaskCreate", input: { subject: "Build widget" } }]),
      makeAssistantEntry([
        { id: "tu-2", name: "TaskUpdate", input: { taskId: "1", status: "in_progress" } },
      ]),
      makeAssistantEntry([
        { id: "tu-3", name: "TaskUpdate", input: { taskId: "1", status: "completed" } },
      ]),
    ];

    const result = computeTaskStates(conversations);
    expect(result.stateByToolUseId.size).toBe(3);

    expect(result.stateByToolUseId.get("tu-1")).toEqual([
      { id: "1", subject: "Build widget", description: undefined, status: "pending" },
    ]);

    expect(result.stateByToolUseId.get("tu-2")).toEqual([
      { id: "1", subject: "Build widget", description: undefined, status: "in_progress" },
    ]);

    expect(result.stateByToolUseId.get("tu-3")).toEqual([
      { id: "1", subject: "Build widget", description: undefined, status: "completed" },
    ]);

    expect(result.latestTasks).toEqual([
      { id: "1", subject: "Build widget", description: undefined, status: "completed" },
    ]);
  });

  test("TaskUpdate for non-existent task snapshots unchanged state", () => {
    const conversations: readonly ExtendedConversation[] = [
      makeAssistantEntry([{ id: "tu-1", name: "TaskCreate", input: { subject: "Existing task" } }]),
      makeAssistantEntry([
        { id: "tu-2", name: "TaskUpdate", input: { taskId: "nonexistent", status: "completed" } },
      ]),
    ];

    const result = computeTaskStates(conversations);

    // The snapshot for the update should be the same as the previous state
    expect(result.stateByToolUseId.get("tu-2")).toEqual([
      { id: "1", subject: "Existing task", description: undefined, status: "pending" },
    ]);
  });

  test("handles multiple tasks with interleaved updates", () => {
    const conversations: readonly ExtendedConversation[] = [
      makeAssistantEntry([{ id: "tu-1", name: "TaskCreate", input: { subject: "Task A" } }]),
      makeAssistantEntry([
        { id: "tu-2", name: "TaskCreate", input: { subject: "Task B", description: "B desc" } },
      ]),
      makeAssistantEntry([
        { id: "tu-3", name: "TaskUpdate", input: { taskId: "1", status: "completed" } },
      ]),
      makeAssistantEntry([
        { id: "tu-4", name: "TaskUpdate", input: { taskId: "2", status: "in_progress" } },
      ]),
    ];

    const result = computeTaskStates(conversations);

    expect(result.latestTasks).toEqual([
      { id: "1", subject: "Task A", description: undefined, status: "completed" },
      { id: "2", subject: "Task B", description: "B desc", status: "in_progress" },
    ]);
  });

  test("TaskUpdate can update subject and description", () => {
    const conversations: readonly ExtendedConversation[] = [
      makeAssistantEntry([{ id: "tu-1", name: "TaskCreate", input: { subject: "Original" } }]),
      makeAssistantEntry([
        {
          id: "tu-2",
          name: "TaskUpdate",
          input: { taskId: "1", subject: "Updated subject", description: "New desc" },
        },
      ]),
    ];

    const result = computeTaskStates(conversations);
    expect(result.stateByToolUseId.get("tu-2")).toEqual([
      { id: "1", subject: "Updated subject", description: "New desc", status: "pending" },
    ]);
  });

  test("ignores x-error entries", () => {
    const conversations: readonly ExtendedConversation[] = [
      { type: "x-error", line: "bad json", lineNumber: 1 },
      makeAssistantEntry([{ id: "tu-1", name: "TaskCreate", input: { subject: "After error" } }]),
    ];

    const result = computeTaskStates(conversations);
    expect(result.stateByToolUseId.size).toBe(1);
    expect(result.latestTasks).toEqual([
      { id: "1", subject: "After error", description: undefined, status: "pending" },
    ]);
  });

  test("ignores invalid TaskCreate input", () => {
    const conversations: readonly ExtendedConversation[] = [
      makeAssistantEntry([{ id: "tu-1", name: "TaskCreate", input: { invalid: true } }]),
    ];

    const result = computeTaskStates(conversations);
    expect(result.stateByToolUseId.size).toBe(0);
    expect(result.latestTasks).toBeNull();
  });

  test("ignores invalid TaskUpdate input (missing id)", () => {
    const conversations: readonly ExtendedConversation[] = [
      makeAssistantEntry([{ id: "tu-1", name: "TaskCreate", input: { subject: "Valid task" } }]),
      makeAssistantEntry([{ id: "tu-2", name: "TaskUpdate", input: { status: "completed" } }]),
    ];

    const result = computeTaskStates(conversations);
    // Only the TaskCreate should be in the map
    expect(result.stateByToolUseId.size).toBe(1);
  });

  test("snapshots are independent arrays (not shared references)", () => {
    const conversations: readonly ExtendedConversation[] = [
      makeAssistantEntry([{ id: "tu-1", name: "TaskCreate", input: { subject: "Task" } }]),
      makeAssistantEntry([
        { id: "tu-2", name: "TaskUpdate", input: { taskId: "1", status: "completed" } },
      ]),
    ];

    const result = computeTaskStates(conversations);
    const snapshot1 = result.stateByToolUseId.get("tu-1");
    const snapshot2 = result.stateByToolUseId.get("tu-2");

    // Snapshots should be different arrays
    expect(snapshot1).not.toBe(snapshot2);
    // And different status values
    expect(snapshot1?.[0]?.status).toBe("pending");
    expect(snapshot2?.[0]?.status).toBe("completed");
  });
});
