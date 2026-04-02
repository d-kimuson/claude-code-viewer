import type { CommandExecutor, FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import type { ClaudeCodeLifeCycleService } from "../core/claude-code/services/ClaudeCodeLifeCycleService.ts";
import type { ApplicationContext } from "../core/platform/services/ApplicationContext.ts";
import type { CcvOptionsService } from "../core/platform/services/CcvOptionsService.ts";
import type { EnvService } from "../core/platform/services/EnvService.ts";
import type { UserConfigService } from "../core/platform/services/UserConfigService.ts";
import type { ProjectRepository } from "../core/project/infrastructure/ProjectRepository.ts";
import type { SchedulerConfigBaseDir } from "../core/scheduler/config.ts";
import type { SessionMetaService } from "../core/session/services/SessionMetaService.ts";

export type HonoRuntime =
  | CcvOptionsService
  | EnvService
  | SessionMetaService
  | FileSystem.FileSystem
  | Path.Path
  | CommandExecutor.CommandExecutor
  | UserConfigService
  | ClaudeCodeLifeCycleService
  | ProjectRepository
  | SchedulerConfigBaseDir
  | ApplicationContext;

export const getHonoRuntime = Effect.runtime<HonoRuntime>();
