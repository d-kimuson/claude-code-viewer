import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import { handle } from "hono/vercel";
import { ClaudeCodeController } from "../../../server/core/claude-code/presentation/ClaudeCodeController";
import { ClaudeCodePermissionController } from "../../../server/core/claude-code/presentation/ClaudeCodePermissionController";
import { ClaudeCodeSessionProcessController } from "../../../server/core/claude-code/presentation/ClaudeCodeSessionProcessController";
import { ClaudeCodeLifeCycleService } from "../../../server/core/claude-code/services/ClaudeCodeLifeCycleService";
import { ClaudeCodePermissionService } from "../../../server/core/claude-code/services/ClaudeCodePermissionService";
import { ClaudeCodeService } from "../../../server/core/claude-code/services/ClaudeCodeService";
import { ClaudeCodeSessionProcessService } from "../../../server/core/claude-code/services/ClaudeCodeSessionProcessService";
import { SSEController } from "../../../server/core/events/presentation/SSEController";
import { EventBus } from "../../../server/core/events/services/EventBus";
import { FileWatcherService } from "../../../server/core/events/services/fileWatcher";
import { FileSystemController } from "../../../server/core/file-system/presentation/FileSystemController";
import { GitController } from "../../../server/core/git/presentation/GitController";
import { GitService } from "../../../server/core/git/services/GitService";
import { ApplicationContext } from "../../../server/core/platform/services/ApplicationContext";
import { EnvService } from "../../../server/core/platform/services/EnvService";
import { UserConfigService } from "../../../server/core/platform/services/UserConfigService";
import { ProjectRepository } from "../../../server/core/project/infrastructure/ProjectRepository";
import { ProjectController } from "../../../server/core/project/presentation/ProjectController";
import { ProjectMetaService } from "../../../server/core/project/services/ProjectMetaService";
import { SessionRepository } from "../../../server/core/session/infrastructure/SessionRepository";
import { VirtualConversationDatabase } from "../../../server/core/session/infrastructure/VirtualConversationDatabase";
import { SessionController } from "../../../server/core/session/presentation/SessionController";
import { SessionMetaService } from "../../../server/core/session/services/SessionMetaService";
import { honoApp } from "../../../server/hono/app";
import { InitializeService } from "../../../server/hono/initialize";
import { routes } from "../../../server/hono/route";

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
      Effect.provide(ApplicationContext.Live),
      Effect.provide(UserConfigService.Live),
      Effect.provide(EventBus.Live),
      Effect.provide(EnvService.Live),
      Effect.provide(NodeContext.layer),
    ),
);

export const GET = handle(honoApp);
export const POST = handle(honoApp);
export const PUT = handle(honoApp);
export const PATCH = handle(honoApp);
export const DELETE = handle(honoApp);
