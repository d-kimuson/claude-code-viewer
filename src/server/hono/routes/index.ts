import { zValidator } from "@hono/zod-validator";
import { Effect, Runtime } from "effect";
import { setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import prexit from "prexit";
import packageJson from "../../../../package.json" with { type: "json" };
import {
  CcvOptionsService,
  type CliOptions,
} from "../../core/platform/services/CcvOptionsService.ts";
import { EnvService } from "../../core/platform/services/EnvService.ts";
import { UserConfigService } from "../../core/platform/services/UserConfigService.ts";
import { userConfigSchema } from "../../lib/config/config.ts";
import type { HonoAppType, HonoContext } from "../app.ts";
import { InitializeService } from "../initialize.ts";
import { AuthMiddleware } from "../middleware/auth.middleware.ts";
import { configMiddleware } from "../middleware/config.middleware.ts";
import { getHonoRuntime } from "../runtime.ts";
import { authRoutes } from "./authRoutes.ts";
import { claudeCodeRoutes } from "./claudeCodeRoutes.ts";
import { featureFlagRoutes } from "./featureFlagRoutes.ts";
import { fileSystemRoutes } from "./fileSystemRoutes.ts";
import { notificationRoutes } from "./notificationRoutes.ts";
import { projectRoutes } from "./projectRoutes.ts";
import { schedulerRoutes } from "./schedulerRoutes.ts";
import { searchRoutes } from "./searchRoutes.ts";
import { sseRoutes } from "./sseRoutes.ts";
import { tasksRoutes } from "./tasksRoutes.ts";

const API_ONLY_ALLOWED_PREFIXES = [
  "/api/version",
  "/api/config",
  "/api/projects",
  "/api/claude-code",
  "/api/search",
  "/api/notifications",
  "/api/sse",
];

const createApiOnlyMiddleware = (apiOnly: boolean) =>
  createMiddleware<HonoContext>(async (c, next) => {
    if (apiOnly) {
      const path = c.req.path;
      const allowed = API_ONLY_ALLOWED_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );
      if (!allowed) {
        return c.json({ error: "Not Found" }, 404);
      }
    }
    return next();
  });

export const routes = (app: HonoAppType, options: CliOptions) =>
  Effect.gen(function* () {
    const ccvOptionsService = yield* CcvOptionsService;
    yield* ccvOptionsService.loadCliOptions(options);

    const envService = yield* EnvService;
    const userConfigService = yield* UserConfigService;
    const initializeService = yield* InitializeService;

    const { authRequiredMiddleware } = yield* AuthMiddleware;
    const apiOnly = (yield* ccvOptionsService.getCcvOptions("apiOnly")) === true;
    const apiOnlyMiddleware = createApiOnlyMiddleware(apiOnly);

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
        .use(apiOnlyMiddleware)
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
        .get("/api/version", (c) => {
          return c.json({
            version: packageJson.version,
          });
        })

        .route("/api/auth", yield* authRoutes)

        .use(authRequiredMiddleware)

        /**
         * Private Routes
         */
        .get("/api/config", (c) => {
          return c.json({
            config: c.get("userConfig"),
          });
        })
        .put("/api/config", zValidator("json", userConfigSchema), (c) => {
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
        .route("/api/notifications", yield* notificationRoutes)
        .route("/api/sse", yield* sseRoutes)
    );
  });

export type RouteType =
  ReturnType<typeof routes> extends Effect.Effect<infer A, unknown, unknown> ? A : never;
