import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import { handle } from "hono/vercel";
import { honoApp } from "../../../server/hono/app";
import { InitializeService } from "../../../server/hono/initialize";
import { routes } from "../../../server/hono/route";
import { ClaudeCodeLifeCycleService } from "../../../server/service/claude-code/ClaudeCodeLifeCycleService";
import { ClaudeCodePermissionService } from "../../../server/service/claude-code/ClaudeCodePermissionService";
import { ClaudeCodeSessionProcessService } from "../../../server/service/claude-code/ClaudeCodeSessionProcessService";
import { EventBus } from "../../../server/service/events/EventBus";
import { FileWatcherService } from "../../../server/service/events/fileWatcher";
import { ProjectMetaService } from "../../../server/service/project/ProjectMetaService";
import { ProjectRepository } from "../../../server/service/project/ProjectRepository";
import { VirtualConversationDatabase } from "../../../server/service/session/PredictSessionsDatabase";
import { SessionMetaService } from "../../../server/service/session/SessionMetaService";
import { SessionRepository } from "../../../server/service/session/SessionRepository";

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
