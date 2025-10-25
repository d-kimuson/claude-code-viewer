import { NodeContext } from "@effect/platform-node";
import { serve } from "@hono/node-server";
import { Effect } from "effect";
import { ClaudeCodeController } from "./core/claude-code/presentation/ClaudeCodeController";
import { ClaudeCodePermissionController } from "./core/claude-code/presentation/ClaudeCodePermissionController";
import { ClaudeCodeSessionProcessController } from "./core/claude-code/presentation/ClaudeCodeSessionProcessController";
import { ClaudeCodeLifeCycleService } from "./core/claude-code/services/ClaudeCodeLifeCycleService";
import { ClaudeCodePermissionService } from "./core/claude-code/services/ClaudeCodePermissionService";
import { ClaudeCodeService } from "./core/claude-code/services/ClaudeCodeService";
import { ClaudeCodeSessionProcessService } from "./core/claude-code/services/ClaudeCodeSessionProcessService";
import { SSEController } from "./core/events/presentation/SSEController";
import { FileWatcherService } from "./core/events/services/fileWatcher";
import { FileSystemController } from "./core/file-system/presentation/FileSystemController";
import { GitController } from "./core/git/presentation/GitController";
import { GitService } from "./core/git/services/GitService";
import { ProjectRepository } from "./core/project/infrastructure/ProjectRepository";
import { ProjectController } from "./core/project/presentation/ProjectController";
import { ProjectMetaService } from "./core/project/services/ProjectMetaService";
import { SchedulerConfigBaseDir } from "./core/scheduler/config";
import { SchedulerService } from "./core/scheduler/domain/Scheduler";
import { SchedulerController } from "./core/scheduler/presentation/SchedulerController";
import { SessionRepository } from "./core/session/infrastructure/SessionRepository";
import { VirtualConversationDatabase } from "./core/session/infrastructure/VirtualConversationDatabase";
import { SessionController } from "./core/session/presentation/SessionController";
import { SessionMetaService } from "./core/session/services/SessionMetaService";
import { honoApp } from "./hono/app";
import { InitializeService } from "./hono/initialize";
import { routes } from "./hono/route";
import { platformLayer } from "./lib/effect/layers";

const program = routes(honoApp);

await Effect.runPromise(
  program
    // 依存の浅い順にコンテナに pipe する必要がある
    .pipe(
      /** Presentation */
      Effect.provide(ProjectController.Live),
      Effect.provide(SessionController.Live),
      Effect.provide(GitController.Live),
      Effect.provide(ClaudeCodeController.Live),
      Effect.provide(ClaudeCodeSessionProcessController.Live),
      Effect.provide(ClaudeCodePermissionController.Live),
      Effect.provide(FileSystemController.Live),
      Effect.provide(SSEController.Live),
      Effect.provide(SchedulerController.Live),
    )
    .pipe(
      /** Application */
      Effect.provide(InitializeService.Live),
      Effect.provide(FileWatcherService.Live),
    )
    .pipe(
      /** Domain */
      Effect.provide(ClaudeCodeLifeCycleService.Live),
      Effect.provide(ClaudeCodePermissionService.Live),
      Effect.provide(ClaudeCodeSessionProcessService.Live),
      Effect.provide(ClaudeCodeService.Live),
      Effect.provide(GitService.Live),
      Effect.provide(SchedulerService.Live),
      Effect.provide(SchedulerConfigBaseDir.Live),
    )
    .pipe(
      /** Infrastructure */
      Effect.provide(ProjectRepository.Live),
      Effect.provide(SessionRepository.Live),
      Effect.provide(ProjectMetaService.Live),
      Effect.provide(SessionMetaService.Live),
      Effect.provide(VirtualConversationDatabase.Live),
    )
    .pipe(
      /** Platform */
      Effect.provide(platformLayer),
      Effect.provide(NodeContext.layer),
    ),
);

const port =
  // biome-ignore lint/style/noProcessEnv: allow only here
  process.env.NODE_ENV === "development"
    ? // biome-ignore lint/style/noProcessEnv: allow only here
      (process.env.DEV_BE_PORT ?? "3401")
    : // biome-ignore lint/style/noProcessEnv: allow only here
      (process.env.PORT ?? "3000");

serve(
  {
    fetch: honoApp.fetch,
    port: parseInt(port, 10),
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
