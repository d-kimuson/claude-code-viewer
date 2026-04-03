import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const addProjectPermissionRule = (projectPath: string, rule: string) =>
    Effect.gen(function* () {
      const claudeDir = path.join(projectPath, ".claude");
      const settingsPath = path.join(claudeDir, "settings.local.json");

      // Read existing file or start with empty object
      const data: Record<string, unknown> = yield* Effect.gen(function* () {
        const exists = yield* fs.exists(settingsPath);
        if (!exists) {
          return {};
        }

        const content = yield* fs.readFileString(settingsPath);
        const parsed: unknown = yield* Effect.try({
          try: (): unknown => JSON.parse(content),
          catch: () => undefined,
        }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

        if (isRecord(parsed)) {
          return { ...parsed };
        }
        return {};
      });

      // Navigate/create permissions object
      const permissions: Record<string, unknown> = isRecord(data.permissions)
        ? { ...data.permissions }
        : {};

      // Navigate/create allow array
      const allow: string[] = isStringArray(permissions.allow) ? [...permissions.allow] : [];

      // Check for duplicate
      if (allow.includes(rule)) {
        return;
      }

      // Append rule
      allow.push(rule);
      permissions.allow = allow;
      data.permissions = permissions;

      // Ensure .claude directory exists
      yield* fs.makeDirectory(claudeDir, { recursive: true });

      // Write back
      yield* fs.writeFileString(settingsPath, JSON.stringify(data, null, 2));
    });

  return {
    addProjectPermissionRule,
  };
});

export type IProjectSettingsService = InferEffect<typeof LayerImpl>;

export class ProjectSettingsService extends Context.Tag("ProjectSettingsService")<
  ProjectSettingsService,
  IProjectSettingsService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
