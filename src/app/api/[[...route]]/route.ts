import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import { handle } from "hono/vercel";
import { ClaudeCodeLifeCycleService } from "../../../server/core/claude-code/services/ClaudeCodeLifeCycleService";
import { ClaudeCodePermissionService } from "../../../server/core/claude-code/services/ClaudeCodePermissionService";
import { ClaudeCodeSessionProcessService } from "../../../server/core/claude-code/services/ClaudeCodeSessionProcessService";
import { EventBus } from "../../../server/core/events/services/EventBus";
import { FileWatcherService } from "../../../server/core/events/services/fileWatcher";
import { ProjectRepository } from "../../../server/core/project/infrastructure/ProjectRepository";
import { ProjectMetaService } from "../../../server/core/project/services/ProjectMetaService";
import { SessionRepository } from "../../../server/core/session/infrastructure/SessionRepository";
import { VirtualConversationDatabase } from "../../../server/core/session/infrastructure/VirtualConversationDatabase";
import { SessionMetaService } from "../../../server/core/session/services/SessionMetaService";
import { honoApp } from "../../../server/hono/app";
import { InitializeService } from "../../../server/hono/initialize";
import { routes } from "../../../server/hono/route";

const program = routes(honoApp);

await Effect.runPromise(
  program.pipe(
    // 依存の浅い順にコンテナに pipe する必要がある

    /** Application */
    Effect.provide(InitializeService.Live),

    /** Domain */
    Effect.provide(ClaudeCodeLifeCycleService.Live),
    Effect.provide(ClaudeCodePermissionService.Live),
    Effect.provide(ClaudeCodeSessionProcessService.Live),

    // Shared Services
    Effect.provide(FileWatcherService.Live),
    Effect.provide(EventBus.Live),

    /** Infrastructure */

    // Repository
    Effect.provide(ProjectRepository.Live),
    Effect.provide(SessionRepository.Live),

    // StorageService
    Effect.provide(ProjectMetaService.Live),
    Effect.provide(SessionMetaService.Live),
    Effect.provide(VirtualConversationDatabase.Live),

    /** Platform */
    Effect.provide(NodeContext.layer),
  ),
);

export const GET = handle(honoApp);
export const POST = handle(honoApp);
export const PUT = handle(honoApp);
export const PATCH = handle(honoApp);
export const DELETE = handle(honoApp);
