import type {
  Conversation,
  ErrorJsonl,
} from "@claude-code-viewer/shared/conversation-schema/index";
import { Effect } from "effect";
import { VirtualConversationDatabase } from "./VirtualConversationDatabase";

describe("VirtualConversationDatabase", () => {
  describe("getProjectVirtualConversations", () => {
    it("can retrieve session list for specified project ID", async () => {
      const program = Effect.gen(function* () {
        const db = yield* VirtualConversationDatabase;

        const projectPath = "/projects/test-project";
        const projectId = Buffer.from(projectPath).toString("base64url");
        const conversations1: (Conversation | ErrorJsonl)[] = [];
        const conversations2: (Conversation | ErrorJsonl)[] = [];
        const conversations3: (Conversation | ErrorJsonl)[] = [];

        yield* db.createVirtualConversation(
          projectId,
          "session-1",
          conversations1,
        );
        yield* db.createVirtualConversation(
          projectId,
          "session-2",
          conversations2,
        );
        yield* db.createVirtualConversation(
          "other-project-id",
          "session-3",
          conversations3,
        );

        const sessions = yield* db.getProjectVirtualConversations(projectId);

        return { sessions };
      });

      const { sessions } = await Effect.runPromise(
        program.pipe(Effect.provide(VirtualConversationDatabase.Live)),
      );

      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.sessionId)).toEqual(
        expect.arrayContaining(["session-1", "session-2"]),
      );
    });

    it("returns empty array when no matching sessions exist", async () => {
      const program = Effect.gen(function* () {
        const db = yield* VirtualConversationDatabase;
        const sessions = yield* db.getProjectVirtualConversations(
          "non-existent-project",
        );
        return { sessions };
      });

      const { sessions } = await Effect.runPromise(
        program.pipe(Effect.provide(VirtualConversationDatabase.Live)),
      );

      expect(sessions).toHaveLength(0);
    });
  });

  describe("getSessionVirtualConversation", () => {
    it("can retrieve session by specified ID", async () => {
      const program = Effect.gen(function* () {
        const db = yield* VirtualConversationDatabase;

        const conversations: (Conversation | ErrorJsonl)[] = [];

        yield* db.createVirtualConversation(
          "project-1",
          "session-1",
          conversations,
        );
        const result = yield* db.getSessionVirtualConversation("session-1");

        return { result };
      });

      const { result } = await Effect.runPromise(
        program.pipe(Effect.provide(VirtualConversationDatabase.Live)),
      );

      expect(result).not.toBeNull();
      expect(result?.sessionId).toBe("session-1");
    });

    it("returns null for non-existent session ID", async () => {
      const program = Effect.gen(function* () {
        const db = yield* VirtualConversationDatabase;
        const result = yield* db.getSessionVirtualConversation(
          "non-existent-session",
        );
        return { result };
      });

      const { result } = await Effect.runPromise(
        program.pipe(Effect.provide(VirtualConversationDatabase.Live)),
      );

      expect(result).toBeNull();
    });
  });

  describe("createVirtualConversation", () => {
    it("can add new session", async () => {
      const program = Effect.gen(function* () {
        const db = yield* VirtualConversationDatabase;

        const conversations: (Conversation | ErrorJsonl)[] = [];

        yield* db.createVirtualConversation(
          "project-1",
          "session-1",
          conversations,
        );
        const result = yield* db.getSessionVirtualConversation("session-1");

        return { result };
      });

      const { result } = await Effect.runPromise(
        program.pipe(Effect.provide(VirtualConversationDatabase.Live)),
      );

      expect(result).not.toBeNull();
      expect(result?.sessionId).toBe("session-1");
    });

    it("can append conversations to existing session", async () => {
      const program = Effect.gen(function* () {
        const db = yield* VirtualConversationDatabase;

        const conversations1: (Conversation | ErrorJsonl)[] = [];
        const conversations2: (Conversation | ErrorJsonl)[] = [];

        yield* db.createVirtualConversation(
          "project-1",
          "session-1",
          conversations1,
        );
        yield* db.createVirtualConversation(
          "project-1",
          "session-1",
          conversations2,
        );
        const result = yield* db.getSessionVirtualConversation("session-1");

        return { result };
      });

      const { result } = await Effect.runPromise(
        program.pipe(Effect.provide(VirtualConversationDatabase.Live)),
      );

      expect(result?.conversations).toHaveLength(0);
    });
  });

  describe("deleteVirtualConversations", () => {
    it("can delete specified session", async () => {
      const program = Effect.gen(function* () {
        const db = yield* VirtualConversationDatabase;

        const conversations: (Conversation | ErrorJsonl)[] = [];

        yield* db.createVirtualConversation(
          "project-1",
          "session-1",
          conversations,
        );
        yield* db.deleteVirtualConversations("session-1");
        const result = yield* db.getSessionVirtualConversation("session-1");

        return { result };
      });

      const { result } = await Effect.runPromise(
        program.pipe(Effect.provide(VirtualConversationDatabase.Live)),
      );

      expect(result).toBeNull();
    });

    it("deleting non-existent session does not cause error", async () => {
      const program = Effect.gen(function* () {
        const db = yield* VirtualConversationDatabase;
        yield* db.deleteVirtualConversations("non-existent-session");
      });

      await expect(
        Effect.runPromise(
          program.pipe(Effect.provide(VirtualConversationDatabase.Live)),
        ),
      ).resolves.not.toThrow();
    });
  });

  describe("state is isolated between multiple instances", () => {
    it("different layers have different states", async () => {
      const projectId = "test-project-id";
      const conversations1: (Conversation | ErrorJsonl)[] = [];
      const conversations2: (Conversation | ErrorJsonl)[] = [];

      const program1 = Effect.gen(function* () {
        const db = yield* VirtualConversationDatabase;
        yield* db.createVirtualConversation(
          projectId,
          "session-1",
          conversations1,
        );
        const sessions = yield* db.getProjectVirtualConversations(projectId);
        return { sessions };
      });

      const program2 = Effect.gen(function* () {
        const db = yield* VirtualConversationDatabase;
        yield* db.createVirtualConversation(
          projectId,
          "session-2",
          conversations2,
        );
        const sessions = yield* db.getProjectVirtualConversations(projectId);
        return { sessions };
      });

      const result1 = await Effect.runPromise(
        program1.pipe(Effect.provide(VirtualConversationDatabase.Live)),
      );

      const result2 = await Effect.runPromise(
        program2.pipe(Effect.provide(VirtualConversationDatabase.Live)),
      );

      expect(result1.sessions).toHaveLength(1);
      expect(result1.sessions.at(0)?.sessionId).toBe("session-1");

      expect(result2.sessions).toHaveLength(1);
      expect(result2.sessions.at(0)?.sessionId).toBe("session-2");
    });
  });
});
