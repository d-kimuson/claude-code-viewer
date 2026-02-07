import type { CommandExecutor, FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import type { ClaudeCodeLifeCycleService } from "../core/claude-code/services/ClaudeCodeLifeCycleService";
import type { CcvOptionsService } from "../core/platform/services/CcvOptionsService";
import type { EnvService } from "../core/platform/services/EnvService";
import type { UserConfigService } from "../core/platform/services/UserConfigService";
import type { ProjectRepository } from "../core/project/infrastructure/ProjectRepository";
import type { SchedulerConfigBaseDir } from "../core/scheduler/config";
import type { VirtualConversationDatabase } from "../core/session/infrastructure/VirtualConversationDatabase";
import type { SessionMetaService } from "../core/session/services/SessionMetaService";

export type HonoRuntime =
  | CcvOptionsService
  | EnvService
  | SessionMetaService
  | VirtualConversationDatabase
  | FileSystem.FileSystem
  | Path.Path
  | CommandExecutor.CommandExecutor
  | UserConfigService
  | ClaudeCodeLifeCycleService
  | ProjectRepository
  | SchedulerConfigBaseDir;

export const getHonoRuntime = Effect.runtime<HonoRuntime>();
