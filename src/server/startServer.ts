import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { createAdaptorServer } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Effect, Layer } from "effect";
import { AgentSessionLayer } from "./core/agent-session/index.ts";
import { AgentSessionController } from "./core/agent-session/presentation/AgentSessionController.ts";
import { CCVAskUserQuestionController } from "./core/claude-code/presentation/CCVAskUserQuestionController.ts";
import { ClaudeCodeController } from "./core/claude-code/presentation/ClaudeCodeController.ts";
import { ClaudeCodePermissionController } from "./core/claude-code/presentation/ClaudeCodePermissionController.ts";
import { ClaudeCodeSessionProcessController } from "./core/claude-code/presentation/ClaudeCodeSessionProcessController.ts";
import { CCVAskUserQuestionService } from "./core/claude-code/services/CCVAskUserQuestionService.ts";
import { ClaudeCodeLifeCycleService } from "./core/claude-code/services/ClaudeCodeLifeCycleService.ts";
import { ClaudeCodePermissionService } from "./core/claude-code/services/ClaudeCodePermissionService.ts";
import { ClaudeCodeService } from "./core/claude-code/services/ClaudeCodeService.ts";
import { ClaudeCodeSessionProcessService } from "./core/claude-code/services/ClaudeCodeSessionProcessService.ts";
import { SSEController } from "./core/events/presentation/SSEController.ts";
import { FileWatcherService } from "./core/events/services/fileWatcher.ts";
import { FeatureFlagController } from "./core/feature-flag/presentation/FeatureFlagController.ts";
import { FileSystemController } from "./core/file-system/presentation/FileSystemController.ts";
import { GitController } from "./core/git/presentation/GitController.ts";
import { GitService } from "./core/git/services/GitService.ts";
import { NotificationController } from "./core/notification/presentation/NotificationController.ts";
import { NotificationService } from "./core/notification/services/NotificationService.ts";
import { isDevelopmentEnv } from "./core/platform/ccvEnv.ts";
import type { CliOptions } from "./core/platform/services/CcvOptionsService.ts";
import { ProjectRepository } from "./core/project/infrastructure/ProjectRepository.ts";
import { ProjectController } from "./core/project/presentation/ProjectController.ts";
import { ProjectMetaService } from "./core/project/services/ProjectMetaService.ts";
import { RateLimitAutoScheduleService } from "./core/rate-limit/services/RateLimitAutoScheduleService.ts";
import { SchedulerConfigBaseDir } from "./core/scheduler/config.ts";
import { SchedulerService } from "./core/scheduler/domain/Scheduler.ts";
import { SchedulerController } from "./core/scheduler/presentation/SchedulerController.ts";
import { SearchController } from "./core/search/presentation/SearchController.ts";
import { SearchService } from "./core/search/services/SearchService.ts";
import { SessionRepository } from "./core/session/infrastructure/SessionRepository.ts";
import { SessionController } from "./core/session/presentation/SessionController.ts";
import { SessionMetaService } from "./core/session/services/SessionMetaService.ts";
import { SyncService } from "./core/sync/services/SyncService.ts";
import { TasksController } from "./core/tasks/presentation/TasksController.ts";
import { TasksService } from "./core/tasks/services/TasksService.ts";
import { TerminalService } from "./core/terminal/TerminalService.ts";
import { honoApp } from "./hono/app.ts";
import { InitializeService } from "./hono/initialize.ts";
import { AuthMiddleware } from "./hono/middleware/auth.middleware.ts";
import { routes } from "./hono/routes/index.ts";
import { DrizzleService } from "./lib/db/DrizzleService.ts";
import { platformLayer } from "./lib/effect/layers.ts";
import { serverLoggerLayer, withServerLogLevel } from "./logging.ts";
import { setupTerminalWebSocket } from "./terminal/terminalWebSocket.ts";

export const startServer = async (options: CliOptions) => {
  const runWithLogger = <A, E>(effect: Effect.Effect<A, E, never>) =>
    Effect.runPromise(
      effect.pipe(withServerLogLevel(options.verbose), Effect.provide(serverLoggerLayer)),
    );

  // biome-ignore lint/style/noProcessEnv: allow only here
  // oxlint-disable-next-line node/no-process-env -- configuration boundary
  const isDevelopment = isDevelopmentEnv(process.env.CCV_ENV);
  const apiOnly = options.apiOnly === true;

  if (!isDevelopment && !apiOnly) {
    const staticPath = await Effect.runPromise(
      Effect.gen(function* () {
        const path = yield* Path.Path;
        return path.resolve(import.meta.dirname, "static");
      }).pipe(Effect.provide(NodeContext.layer)),
    );
    await runWithLogger(Effect.logInfo(`Serving static files from ${staticPath}`));
    const indexHtml = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        return yield* fs.readFileString(path.resolve(staticPath, "index.html"));
      }).pipe(Effect.provide(NodeContext.layer)),
    );

    honoApp.use(
      "/assets/*",
      serveStatic({
        root: staticPath,
      }),
    );

    honoApp.use("*", async (c, next) => {
      if (c.req.path.startsWith("/api")) {
        return next();
      }

      return c.html(indexHtml);
    });
  }

  const server = createAdaptorServer({
    fetch: honoApp.fetch,
  });

  const program = Effect.gen(function* () {
    yield* routes(honoApp, options);
    if (!apiOnly) {
      yield* setupTerminalWebSocket(server);
    }
  })
    // 依存の浅い順にコンテナに pipe する必要がある
    .pipe(Effect.provide(MainLayer), Effect.scoped);

  await Effect.runPromise(program);

  const port = isDevelopment
    ? // biome-ignore lint/style/noProcessEnv: allow only here
      // oxlint-disable-next-line node/no-process-env -- configuration boundary
      (process.env.DEV_BE_PORT ?? "3401")
    : // biome-ignore lint/style/noProcessEnv: allow only here
      // oxlint-disable-next-line node/no-process-env -- configuration boundary
      (options.port ?? process.env.PORT ?? "3000");

  // biome-ignore lint/style/noProcessEnv: allow only here
  // oxlint-disable-next-line node/no-process-env -- configuration boundary
  const hostname = options.hostname ?? process.env.HOSTNAME ?? "localhost";

  server.listen(parseInt(port, 10), hostname, () => {
    const info = server.address();
    const serverPort = typeof info === "object" && info !== null ? info.port : port;
    const mode = apiOnly ? " (API-only mode)" : "";
    void runWithLogger(
      Effect.logInfo(`Server is running on http://${hostname}:${serverPort}${mode}`),
    );
  });
};

const PlatformLayer = Layer.mergeAll(platformLayer, NodeContext.layer);

const InfraBasics = Layer.mergeAll(ProjectMetaService.Live, SessionMetaService.Live).pipe(
  Layer.provideMerge(SyncService.Live),
  Layer.provideMerge(DrizzleService.Live),
);

const InfraRepos = Layer.mergeAll(ProjectRepository.Live, SessionRepository.Live).pipe(
  Layer.provideMerge(InfraBasics),
);

const InfraLayer = AgentSessionLayer.pipe(Layer.provideMerge(InfraRepos));

const DomainBase = Layer.mergeAll(
  CCVAskUserQuestionService.Live,
  ClaudeCodePermissionService.Live,
  ClaudeCodeSessionProcessService.Live,
  ClaudeCodeService.Live,
  GitService.Live,
  NotificationService.Live,
  SchedulerService.Live,
  SchedulerConfigBaseDir.Live,
  SearchService.Live,
  TasksService.Live,
);

const DomainLayer = ClaudeCodeLifeCycleService.Live.pipe(Layer.provideMerge(DomainBase));

const AppServices = Layer.mergeAll(
  FileWatcherService.Live,
  RateLimitAutoScheduleService.Live,
  AuthMiddleware.Live,
  TerminalService.Live,
);

const ApplicationLayer = InitializeService.Live.pipe(Layer.provideMerge(AppServices));

const PresentationLayer = Layer.mergeAll(
  ProjectController.Live,
  SessionController.Live,
  AgentSessionController.Live,
  GitController.Live,
  ClaudeCodeController.Live,
  ClaudeCodeSessionProcessController.Live,
  CCVAskUserQuestionController.Live,
  ClaudeCodePermissionController.Live,
  FileSystemController.Live,
  SSEController.Live,
  NotificationController.Live,
  SchedulerController.Live,
  FeatureFlagController.Live,
  SearchController.Live,
  TasksController.Live,
);

const MainLayer = PresentationLayer.pipe(
  Layer.provideMerge(ApplicationLayer),
  Layer.provideMerge(DomainLayer),
  Layer.provideMerge(InfraLayer),
  Layer.provideMerge(PlatformLayer),
);
