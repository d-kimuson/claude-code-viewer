import prexit from "prexit";
import { ulid } from "ulid";
import type { Config } from "../../config/config";
import { eventBus } from "../events/EventBus";
import { predictSessionsDatabase } from "../session/PredictSessionsDatabase";
import { ClaudeCodeExecutor } from "./ClaudeCodeExecutor";
import { createMessageGenerator } from "./createMessageGenerator";
import type {
  AliveClaudeCodeTask,
  ClaudeCodeTask,
  PendingClaudeCodeTask,
  PermissionRequest,
  PermissionResponse,
  RunningClaudeCodeTask,
} from "./types";

export class ClaudeCodeTaskController {
  private claudeCode: ClaudeCodeExecutor;
  private tasks: ClaudeCodeTask[] = [];
  private config: Config;
  private pendingPermissionRequests: Map<string, PermissionRequest> = new Map();
  private permissionResponses: Map<string, PermissionResponse> = new Map();

  constructor(config: Config) {
    this.claudeCode = new ClaudeCodeExecutor();
    this.config = config;

    prexit(() => {
      this.aliveTasks.forEach((task) => {
        task.abortController.abort();
      });
    });
  }

  public updateConfig(config: Config) {
    this.config = config;
  }

  public respondToPermissionRequest(response: PermissionResponse) {
    this.permissionResponses.set(response.permissionRequestId, response);
    this.pendingPermissionRequests.delete(response.permissionRequestId);
  }

  private createCanUseToolCallback(taskId: string, sessionId?: string) {
    return async (
      toolName: string,
      toolInput: Record<string, unknown>,
      _options: { signal: AbortSignal },
    ) => {
      // If not in default mode, use the configured permission mode behavior
      if (this.config.permissionMode !== "default") {
        // Convert Claude Code permission modes to canUseTool behaviors
        if (
          this.config.permissionMode === "bypassPermissions" ||
          this.config.permissionMode === "acceptEdits"
        ) {
          return {
            behavior: "allow" as const,
            updatedInput: toolInput,
          };
        } else {
          // plan mode should deny actual tool execution
          return {
            behavior: "deny" as const,
            message: "Tool execution is disabled in plan mode",
          };
        }
      }

      // Create permission request
      const permissionRequest: PermissionRequest = {
        id: ulid(),
        taskId,
        sessionId,
        toolName,
        toolInput,
        timestamp: Date.now(),
      };

      // Store the request
      this.pendingPermissionRequests.set(
        permissionRequest.id,
        permissionRequest,
      );

      // Emit event to notify UI
      eventBus.emit("permissionRequested", {
        permissionRequest,
      });

      // Wait for user response with timeout
      const response = await this.waitForPermissionResponse(
        permissionRequest.id,
        60000,
      ); // 60 second timeout

      if (response) {
        if (response.decision === "allow") {
          return {
            behavior: "allow" as const,
            updatedInput: toolInput,
          };
        } else {
          return {
            behavior: "deny" as const,
            message: "Permission denied by user",
          };
        }
      } else {
        // Timeout - default to deny for security
        this.pendingPermissionRequests.delete(permissionRequest.id);
        return {
          behavior: "deny" as const,
          message: "Permission request timed out",
        };
      }
    };
  }

  private async waitForPermissionResponse(
    permissionRequestId: string,
    timeoutMs: number,
  ): Promise<PermissionResponse | null> {
    return new Promise((resolve) => {
      const checkResponse = () => {
        const response = this.permissionResponses.get(permissionRequestId);
        if (response) {
          this.permissionResponses.delete(permissionRequestId);
          resolve(response);
          return;
        }

        // Check if request was cancelled/deleted
        if (!this.pendingPermissionRequests.has(permissionRequestId)) {
          resolve(null);
          return;
        }

        // Continue polling
        setTimeout(checkResponse, 100);
      };

      // Set timeout
      setTimeout(() => {
        resolve(null);
      }, timeoutMs);

      // Start polling
      checkResponse();
    });
  }

  public get aliveTasks() {
    return this.tasks.filter(
      (task) => task.status === "running" || task.status === "paused",
    );
  }

  public async startOrContinueTask(
    currentSession: {
      cwd: string;
      projectId: string;
      sessionId?: string;
    },
    message: string,
  ): Promise<AliveClaudeCodeTask> {
    const existingTask = this.aliveTasks.find(
      (task) => task.sessionId === currentSession.sessionId,
    );

    if (existingTask) {
      console.log(
        `Alive task for session(id=${currentSession.sessionId}) continued.`,
      );
      const result = await this.continueTask(existingTask, message);
      return result;
    } else {
      if (currentSession.sessionId === undefined) {
        console.log(`New task started.`);
      } else {
        console.log(
          `New task started for existing session(id=${currentSession.sessionId}).`,
        );
      }

      const result = await this.startTask(currentSession, message);
      return result;
    }
  }

  private async continueTask(task: AliveClaudeCodeTask, message: string) {
    task.setNextMessage(message);
    await task.awaitFirstMessage();
    return task;
  }

  private startTask(
    currentSession: {
      cwd: string;
      projectId: string;
      sessionId?: string;
    },
    userMessage: string,
  ) {
    const {
      generateMessages,
      setNextMessage,
      setFirstMessagePromise,
      resolveFirstMessage,
      awaitFirstMessage,
    } = createMessageGenerator(userMessage);

    const task: PendingClaudeCodeTask = {
      status: "pending",
      id: ulid(),
      projectId: currentSession.projectId,
      baseSessionId: currentSession.sessionId,
      cwd: currentSession.cwd,
      generateMessages,
      setNextMessage,
      setFirstMessagePromise,
      resolveFirstMessage,
      awaitFirstMessage,
      onMessageHandlers: [],
    };

    let aliveTaskResolve: (task: AliveClaudeCodeTask) => void;
    let aliveTaskReject: (error: unknown) => void;

    const aliveTaskPromise = new Promise<AliveClaudeCodeTask>(
      (resolve, reject) => {
        aliveTaskResolve = resolve;
        aliveTaskReject = reject;
      },
    );

    let resolved = false;

    const handleTask = async () => {
      try {
        const abortController = new AbortController();

        let currentTask: AliveClaudeCodeTask | undefined;

        for await (const message of this.claudeCode.query(
          task.generateMessages(),
          {
            resume: task.baseSessionId,
            cwd: task.cwd,
            permissionMode: this.config.permissionMode,
            canUseTool: this.createCanUseToolCallback(
              task.id,
              task.baseSessionId,
            ),
            abortController: abortController,
          },
        )) {
          currentTask ??= this.aliveTasks.find((t) => t.id === task.id);

          if (currentTask !== undefined && currentTask.status === "paused") {
            this.upsertExistingTask({
              ...currentTask,
              status: "running",
            });
          }

          if (
            message.type === "system" &&
            message.subtype === "init" &&
            currentSession.sessionId === undefined
          ) {
            // because it takes time for the Claude Code file to be updated, simulate the message
            predictSessionsDatabase.createPredictSession({
              id: message.session_id,
              jsonlFilePath: message.session_id,
              conversations: [
                {
                  type: "user",
                  message: {
                    role: "user",
                    content: userMessage,
                  },
                  isSidechain: false,
                  userType: "external",
                  cwd: message.cwd,
                  sessionId: message.session_id,
                  version: this.claudeCode.version?.toString() ?? "unknown",
                  uuid: message.uuid,
                  timestamp: new Date().toISOString(),
                  parentUuid: null,
                },
              ],
              meta: {
                firstCommand: null,
                lastModifiedAt: new Date().toISOString(),
                messageCount: 0,
              },
            });
          }

          if (!resolved) {
            const runningTask: RunningClaudeCodeTask = {
              status: "running",
              id: task.id,
              projectId: task.projectId,
              cwd: task.cwd,
              generateMessages: task.generateMessages,
              setNextMessage: task.setNextMessage,
              resolveFirstMessage: task.resolveFirstMessage,
              setFirstMessagePromise: task.setFirstMessagePromise,
              awaitFirstMessage: task.awaitFirstMessage,
              onMessageHandlers: task.onMessageHandlers,
              sessionId: message.session_id,
              abortController: abortController,
            };
            this.tasks.push(runningTask);
            aliveTaskResolve(runningTask);
            resolved = true;
          }

          resolveFirstMessage();

          await Promise.all(
            task.onMessageHandlers.map(async (onMessageHandler) => {
              await onMessageHandler(message);
            }),
          );

          if (currentTask !== undefined && message.type === "result") {
            this.upsertExistingTask({
              ...currentTask,
              status: "paused",
            });
            resolved = true;
            setFirstMessagePromise();
            predictSessionsDatabase.deletePredictSession(currentTask.sessionId);
          }
        }

        const updatedTask = this.aliveTasks.find((t) => t.id === task.id);

        if (updatedTask === undefined) {
          console.log(
            "[DEBUG startTask] 17. ERROR: Task not found in aliveTasks",
          );
          const error = new Error(
            `illegal state: task is not running, task: ${JSON.stringify(
              updatedTask,
            )}`,
          );
          aliveTaskReject(error);
          throw error;
        }

        this.upsertExistingTask({
          ...updatedTask,
          status: "completed",
        });
      } catch (error) {
        if (!resolved) {
          console.log(
            "[DEBUG startTask] 20. Rejecting task (not yet resolved)",
          );
          aliveTaskReject(error);
          resolved = true;
        }

        if (error instanceof Error) {
          console.error(error.message, error.stack);
        } else {
          console.error(error);
        }

        this.upsertExistingTask({
          ...task,
          status: "failed",
        });
      }
    };

    // continue background
    void handleTask();

    return aliveTaskPromise;
  }

  public abortTask(sessionId: string) {
    const task = this.aliveTasks.find((task) => task.sessionId === sessionId);
    if (!task) {
      throw new Error("Alive Task not found");
    }

    task.abortController.abort();
    this.upsertExistingTask({
      id: task.id,
      projectId: task.projectId,
      sessionId: task.sessionId,
      status: "failed",
      cwd: task.cwd,
      generateMessages: task.generateMessages,
      setNextMessage: task.setNextMessage,
      resolveFirstMessage: task.resolveFirstMessage,
      setFirstMessagePromise: task.setFirstMessagePromise,
      awaitFirstMessage: task.awaitFirstMessage,
      onMessageHandlers: task.onMessageHandlers,
      baseSessionId: task.baseSessionId,
    });
  }

  private upsertExistingTask(task: ClaudeCodeTask) {
    const target = this.tasks.find((t) => t.id === task.id);

    if (!target) {
      console.error("Task not found", task);
      this.tasks.push(task);
    } else {
      Object.assign(target, task);
    }

    if (task.status === "paused" || task.status === "running") {
      eventBus.emit("taskChanged", {
        aliveTasks: this.aliveTasks,
        changed: task,
      });
    }
  }
}
