import { zValidator } from "@hono/zod-validator";
import { Effect, Runtime } from "effect";
import { setCookie } from "hono/cookie";
import prexit from "prexit";
import packageJson from "../../../../package.json" with { type: "json" };
import {
  CcvOptionsService,
  type CliOptions,
} from "../../core/platform/services/CcvOptionsService";
import { EnvService } from "../../core/platform/services/EnvService";
import { UserConfigService } from "../../core/platform/services/UserConfigService";
import { userConfigSchema } from "../../lib/config/config";
import type { HonoAppType } from "../app";
import { InitializeService } from "../initialize";
import { AuthMiddleware } from "../middleware/auth.middleware";
import { configMiddleware } from "../middleware/config.middleware";
import { getHonoRuntime } from "../runtime";
import { authRoutes } from "./authRoutes";
import { claudeCodeRoutes } from "./claudeCodeRoutes";
import { featureFlagRoutes } from "./featureFlagRoutes";
import { fileSystemRoutes } from "./fileSystemRoutes";
import { projectRoutes } from "./projectRoutes";
import { schedulerRoutes } from "./schedulerRoutes";
import { searchRoutes } from "./searchRoutes";
import { sseRoutes } from "./sseRoutes";
import { tasksRoutes } from "./tasksRoutes";

export const routes = (app: HonoAppType, options: CliOptions) =>
  Effect.gen(function* () {
    const ccvOptionsService = yield* CcvOptionsService;
    yield* ccvOptionsService.loadCliOptions(options);

    const envService = yield* EnvService;
    const userConfigService = yield* UserConfigService;
    const initializeService = yield* InitializeService;

    const { authRequiredMiddleware } = yield* AuthMiddleware;

    const runtime = yield* getHonoRuntime;

    if ((yield* envService.getEnv("NEXT_PHASE")) !== "phase-production-build") {
      yield* initializeService.startInitialization();

      prexit(async () => {
        await Runtime.runPromise(runtime)(initializeService.stopCleanup());
      });
    }

    return (
      app
        // middleware
        .use(configMiddleware)
        .use(async (c, next) => {
          await Runtime.runPromise(
            runtime,
            userConfigService.setUserConfig({
              ...c.get("userConfig"),
            }),
          );

          await next();
        })

        /**
         * Auth un-necessary Routes
         */
        .get("/api/version", async (c) => {
          return c.json({
            version: packageJson.version,
          });
        })

        .route("/api/auth", yield* authRoutes)

        .use(authRequiredMiddleware)

        /**
         * Private Routes
         */
        .get("/api/config", async (c) => {
          return c.json({
            config: c.get("userConfig"),
          });
        })
        .put("/api/config", zValidator("json", userConfigSchema), async (c) => {
          const { ...config } = c.req.valid("json");

          setCookie(c, "ccv-config", JSON.stringify(config));

          return c.json({
            config,
          });
        })

        // core routes
        .route("/api/projects", yield* projectRoutes)
        .route("/api/claude-code", yield* claudeCodeRoutes)
        .route("/api/scheduler", yield* schedulerRoutes)
        .route("/api/file-system", yield* fileSystemRoutes)
        .route("/api/search", yield* searchRoutes)
        .route("/api/feature-flags", yield* featureFlagRoutes)
        .route("/api/tasks", yield* tasksRoutes)
        .route("/api/sse", yield* sseRoutes)
    );
  });

export type RouteType = ReturnType<typeof routes> extends Effect.Effect<
  infer A,
  unknown,
  unknown
>
  ? A
  : never;
