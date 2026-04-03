import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import { testProjectRepositoryLayer } from "../../../../testing/layers/testProjectRepositoryLayer.ts";
import { ApplicationContext } from "../../platform/services/ApplicationContext.ts";
import { ClaudeCodeService } from "../services/ClaudeCodeService.ts";
import { ClaudeCodeController } from "./ClaudeCodeController.ts";

// Mock ClaudeCodeService to avoid depending on ClaudeCode.Config
const testClaudeCodeServiceLayer = Layer.succeed(
  ClaudeCodeService,
  ClaudeCodeService.of({
    getClaudeCodeMeta: () =>
      Effect.succeed({
        claudeCodeExecutablePath: "/mock/claude",
        claudeCodeVersion: null,
      }),
    getAvailableFeatures: () =>
      Effect.succeed({
        canUseTool: false,
        uuidOnSDKMessage: false,
        agentSdk: false,
        sidechainSeparation: false,
        runSkillsDirectly: false,
      }),
    getMcpList: () => Effect.succeed([]),
  }),
);

describe("ClaudeCodeController.getClaudeCommands", () => {
  let testDir: string;
  let globalCommandsDir: string;
  let projectDir: string;
  let projectCommandsDir: string;

  beforeEach(async () => {
    // Create temporary test directories for commands
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const tmpDir = yield* fs.makeTempDirectory();
        const globalDir = `${tmpDir}/global-commands`;
        const projDir = `${tmpDir}/project`;
        const projectCommandsDir = `${projDir}/.claude/commands`;

        yield* fs.makeDirectory(globalDir, { recursive: true });
        yield* fs.makeDirectory(projectCommandsDir, { recursive: true });

        return {
          tmpDir,
          globalDir,
          projectDir: projDir,
          projectCommandsDir,
        };
      }).pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer())),
    );

    testDir = result.tmpDir;
    globalCommandsDir = result.globalDir;
    projectDir = result.projectDir;
    projectCommandsDir = result.projectCommandsDir;
  });

  afterEach(async () => {
    // Cleanup is handled by scoped temp directory
  });

  it.live("should return flat structure commands from global and project directories", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      // Global commands
      yield* fs.writeFileString(`${globalCommandsDir}/impl.md`, "# Impl");
      yield* fs.writeFileString(`${globalCommandsDir}/review.md`, "# Review");

      // Project commands
      yield* fs.writeFileString(`${projectCommandsDir}/deploy.md`, "# Deploy");

      const projectLayer = testProjectRepositoryLayer({
        projects: [
          {
            id: "test-project",
            claudeProjectPath: "/path/to/project",
            lastModifiedAt: new Date(),
            meta: {
              projectName: "Test Project",
              projectPath: projectDir,
              sessionCount: 0,
            },
          },
        ],
      });

      const appContextLayer = Layer.succeed(
        ApplicationContext,
        ApplicationContext.of({
          claudeCodePaths: Effect.succeed({
            globalClaudeDirectoryPath: testDir,
            claudeCommandsDirPath: globalCommandsDir,
            claudeSkillsDirPath: `${testDir}/skills`,
            claudeAgentsDirPath: `${testDir}/agents`,
            claudeProjectsDirPath: `${testDir}/projects`,
          }),
        }),
      );

      const controllerLayer = ClaudeCodeController.Live.pipe(
        Layer.provide(testClaudeCodeServiceLayer),
        Layer.provide(projectLayer),
        Layer.provide(appContextLayer),
        Layer.provide(NodeContext.layer),
        Layer.provide(testPlatformLayer()),
      );

      const controller = yield* ClaudeCodeController.pipe(Effect.provide(controllerLayer));
      const result = yield* controller
        .getClaudeCommands({
          projectId: "test-project",
        })
        .pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer()));

      expect(result.status).toBe(200);
      expect(result.response.globalCommandsLegacy).toHaveLength(2);
      expect(result.response.globalCommandsLegacy).toContain("impl");
      expect(result.response.globalCommandsLegacy).toContain("review");
      expect(result.response.projectCommandsLegacy).toHaveLength(1);
      expect(result.response.projectCommandsLegacy).toContain("deploy");
      expect(result.response.globalSkillsLegacy).toEqual([]);
      expect(result.response.projectSkillsLegacy).toEqual([]);
      expect(result.response.defaultCommandsLegacy).toEqual([
        "init",
        "compact",
        "security-review",
        "review",
      ]);
    }).pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer())),
  );

  it.live("should return subdirectory commands with colon-separated names", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      // Global commands with subdirectories
      yield* fs.makeDirectory(`${globalCommandsDir}/frontend`, {
        recursive: true,
      });
      yield* fs.writeFileString(`${globalCommandsDir}/frontend/impl.md`, "# Frontend Impl");
      yield* fs.writeFileString(`${globalCommandsDir}/frontend/review.md`, "# Frontend Review");
      yield* fs.writeFileString(`${globalCommandsDir}/backend.md`, "# Backend");

      // Project commands with subdirectories
      yield* fs.makeDirectory(`${projectCommandsDir}/api`, {
        recursive: true,
      });
      yield* fs.writeFileString(`${projectCommandsDir}/api/create.md`, "# API Create");

      const projectLayer = testProjectRepositoryLayer({
        projects: [
          {
            id: "test-project",
            claudeProjectPath: "/path/to/project",
            lastModifiedAt: new Date(),
            meta: {
              projectName: "Test Project",
              projectPath: projectDir,
              sessionCount: 0,
            },
          },
        ],
      });

      const appContextLayer = Layer.succeed(
        ApplicationContext,
        ApplicationContext.of({
          claudeCodePaths: Effect.succeed({
            globalClaudeDirectoryPath: testDir,
            claudeCommandsDirPath: globalCommandsDir,
            claudeSkillsDirPath: `${testDir}/skills`,
            claudeAgentsDirPath: `${testDir}/agents`,
            claudeProjectsDirPath: `${testDir}/projects`,
          }),
        }),
      );

      const controllerLayer = ClaudeCodeController.Live.pipe(
        Layer.provide(testClaudeCodeServiceLayer),
        Layer.provide(projectLayer),
        Layer.provide(appContextLayer),
        Layer.provide(NodeContext.layer),
        Layer.provide(testPlatformLayer()),
      );

      const controller = yield* ClaudeCodeController.pipe(Effect.provide(controllerLayer));
      const result = yield* controller
        .getClaudeCommands({
          projectId: "test-project",
        })
        .pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer()));

      expect(result.status).toBe(200);
      expect(result.response.globalCommandsLegacy).toHaveLength(3);
      expect(result.response.globalCommandsLegacy).toContain("backend");
      expect(result.response.globalCommandsLegacy).toContain("frontend:impl");
      expect(result.response.globalCommandsLegacy).toContain("frontend:review");
      expect(result.response.projectCommandsLegacy).toHaveLength(1);
      expect(result.response.projectCommandsLegacy).toContain("api:create");
      expect(result.response.globalSkillsLegacy).toEqual([]);
      expect(result.response.projectSkillsLegacy).toEqual([]);
    }).pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer())),
  );

  it.live("should return deeply nested commands with multiple colons", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      yield* fs.makeDirectory(`${globalCommandsDir}/frontend/components/buttons`, {
        recursive: true,
      });
      yield* fs.writeFileString(
        `${globalCommandsDir}/frontend/components/buttons/primary.md`,
        "# Primary Button",
      );

      const projectLayer = testProjectRepositoryLayer({
        projects: [
          {
            id: "test-project",
            claudeProjectPath: "/path/to/project",
            lastModifiedAt: new Date(),
            meta: {
              projectName: "Test Project",
              projectPath: projectDir,
              sessionCount: 0,
            },
          },
        ],
      });

      const appContextLayer = Layer.succeed(
        ApplicationContext,
        ApplicationContext.of({
          claudeCodePaths: Effect.succeed({
            globalClaudeDirectoryPath: testDir,
            claudeCommandsDirPath: globalCommandsDir,
            claudeSkillsDirPath: `${testDir}/skills`,
            claudeAgentsDirPath: `${testDir}/agents`,
            claudeProjectsDirPath: `${testDir}/projects`,
          }),
        }),
      );

      const controllerLayer = ClaudeCodeController.Live.pipe(
        Layer.provide(testClaudeCodeServiceLayer),
        Layer.provide(projectLayer),
        Layer.provide(appContextLayer),
        Layer.provide(NodeContext.layer),
        Layer.provide(testPlatformLayer()),
      );

      const controller = yield* ClaudeCodeController.pipe(Effect.provide(controllerLayer));
      const result = yield* controller
        .getClaudeCommands({
          projectId: "test-project",
        })
        .pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer()));

      expect(result.status).toBe(200);
      expect(result.response.globalCommandsLegacy).toHaveLength(1);
      expect(result.response.globalCommandsLegacy).toContain("frontend:components:buttons:primary");
      expect(result.response.globalSkillsLegacy).toEqual([]);
      expect(result.response.projectSkillsLegacy).toEqual([]);
    }).pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer())),
  );

  it.live("should return empty arrays when command directories do not exist", () =>
    Effect.gen(function* () {
      const projectLayer = testProjectRepositoryLayer({
        projects: [
          {
            id: "test-project",
            claudeProjectPath: "/path/to/project",
            lastModifiedAt: new Date(),
            meta: {
              projectName: "Test Project",
              projectPath: projectDir,
              sessionCount: 0,
            },
          },
        ],
      });

      const appContextLayer = Layer.succeed(
        ApplicationContext,
        ApplicationContext.of({
          claudeCodePaths: Effect.succeed({
            globalClaudeDirectoryPath: testDir,
            claudeCommandsDirPath: `${testDir}/non-existent`,
            claudeSkillsDirPath: `${testDir}/skills`,
            claudeAgentsDirPath: `${testDir}/agents`,
            claudeProjectsDirPath: `${testDir}/projects`,
          }),
        }),
      );

      const controllerLayer = ClaudeCodeController.Live.pipe(
        Layer.provide(testClaudeCodeServiceLayer),
        Layer.provide(projectLayer),
        Layer.provide(appContextLayer),
        Layer.provide(NodeContext.layer),
        Layer.provide(testPlatformLayer()),
      );

      const controller = yield* ClaudeCodeController.pipe(Effect.provide(controllerLayer));
      const result = yield* controller
        .getClaudeCommands({
          projectId: "test-project",
        })
        .pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer()));

      expect(result.status).toBe(200);
      expect(result.response.globalCommandsLegacy).toEqual([]);
      expect(result.response.projectCommandsLegacy).toEqual([]);
      expect(result.response.globalSkillsLegacy).toEqual([]);
      expect(result.response.projectSkillsLegacy).toEqual([]);
    }).pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer())),
  );

  it.live("should return empty project commands when projectPath is null", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(`${globalCommandsDir}/impl.md`, "# Impl");

      const projectLayer = testProjectRepositoryLayer({
        projects: [
          {
            id: "test-project",
            claudeProjectPath: "/path/to/project",
            lastModifiedAt: new Date(),
            meta: {
              projectName: "Test Project",
              projectPath: null, // No project path
              sessionCount: 0,
            },
          },
        ],
      });

      const appContextLayer = Layer.succeed(
        ApplicationContext,
        ApplicationContext.of({
          claudeCodePaths: Effect.succeed({
            globalClaudeDirectoryPath: testDir,
            claudeCommandsDirPath: globalCommandsDir,
            claudeSkillsDirPath: `${testDir}/skills`,
            claudeAgentsDirPath: `${testDir}/agents`,
            claudeProjectsDirPath: `${testDir}/projects`,
          }),
        }),
      );

      const controllerLayer = ClaudeCodeController.Live.pipe(
        Layer.provide(testClaudeCodeServiceLayer),
        Layer.provide(projectLayer),
        Layer.provide(appContextLayer),
        Layer.provide(NodeContext.layer),
        Layer.provide(testPlatformLayer()),
      );

      const controller = yield* ClaudeCodeController.pipe(Effect.provide(controllerLayer));
      const result = yield* controller
        .getClaudeCommands({
          projectId: "test-project",
        })
        .pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer()));

      expect(result.status).toBe(200);
      expect(result.response.globalCommandsLegacy).toHaveLength(1);
      expect(result.response.globalCommandsLegacy).toContain("impl");
      expect(result.response.projectCommandsLegacy).toEqual([]);
      expect(result.response.globalSkillsLegacy).toEqual([]);
      expect(result.response.projectSkillsLegacy).toEqual([]);
    }).pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer())),
  );

  it.live("should exclude hidden files and directories from command list", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      yield* fs.writeFileString(`${globalCommandsDir}/visible.md`, "# Visible");
      yield* fs.writeFileString(`${globalCommandsDir}/.hidden.md`, "# Hidden");
      yield* fs.makeDirectory(`${globalCommandsDir}/.hidden-dir`, {
        recursive: true,
      });
      yield* fs.writeFileString(`${globalCommandsDir}/.hidden-dir/impl.md`, "# Hidden Impl");

      const projectLayer = testProjectRepositoryLayer({
        projects: [
          {
            id: "test-project",
            claudeProjectPath: "/path/to/project",
            lastModifiedAt: new Date(),
            meta: {
              projectName: "Test Project",
              projectPath: projectDir,
              sessionCount: 0,
            },
          },
        ],
      });

      const appContextLayer = Layer.succeed(
        ApplicationContext,
        ApplicationContext.of({
          claudeCodePaths: Effect.succeed({
            globalClaudeDirectoryPath: testDir,
            claudeCommandsDirPath: globalCommandsDir,
            claudeSkillsDirPath: `${testDir}/skills`,
            claudeAgentsDirPath: `${testDir}/agents`,
            claudeProjectsDirPath: `${testDir}/projects`,
          }),
        }),
      );

      const controllerLayer = ClaudeCodeController.Live.pipe(
        Layer.provide(testClaudeCodeServiceLayer),
        Layer.provide(projectLayer),
        Layer.provide(appContextLayer),
        Layer.provide(NodeContext.layer),
        Layer.provide(testPlatformLayer()),
      );

      const controller = yield* ClaudeCodeController.pipe(Effect.provide(controllerLayer));
      const result = yield* controller
        .getClaudeCommands({
          projectId: "test-project",
        })
        .pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer()));

      expect(result.status).toBe(200);
      expect(result.response.globalCommandsLegacy).toHaveLength(1);
      expect(result.response.globalCommandsLegacy).toContain("visible");
      expect(result.response.globalCommandsLegacy).not.toContain(".hidden");
      expect(result.response.globalCommandsLegacy).not.toContain(".hidden-dir:impl");
      expect(result.response.globalSkillsLegacy).toEqual([]);
      expect(result.response.projectSkillsLegacy).toEqual([]);
    }).pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer())),
  );

  it.live("should return skills when runSkillsDirectly flag is enabled", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      // Setup: Create skill directories with SKILL.md files
      const globalSkillsDir = `${testDir}/global-skills`;
      const projectSkillsDir = `${projectDir}/.claude/skills`;

      // Global skills
      yield* fs.makeDirectory(`${globalSkillsDir}/typescript`, {
        recursive: true,
      });
      yield* fs.writeFileString(`${globalSkillsDir}/typescript/SKILL.md`, "# TypeScript Skill");

      yield* fs.makeDirectory(`${globalSkillsDir}/react`, {
        recursive: true,
      });
      yield* fs.writeFileString(`${globalSkillsDir}/react/SKILL.md`, "# React Skill");

      // Nested global skill
      yield* fs.makeDirectory(`${globalSkillsDir}/frontend/design`, {
        recursive: true,
      });
      yield* fs.writeFileString(
        `${globalSkillsDir}/frontend/design/SKILL.md`,
        "# Frontend Design Skill",
      );

      // Project skills
      yield* fs.makeDirectory(`${projectSkillsDir}/custom-impl`, {
        recursive: true,
      });
      yield* fs.writeFileString(
        `${projectSkillsDir}/custom-impl/SKILL.md`,
        "# Custom Implementation Skill",
      );

      // Nested project skill
      yield* fs.makeDirectory(`${projectSkillsDir}/api/validation`, {
        recursive: true,
      });
      yield* fs.writeFileString(
        `${projectSkillsDir}/api/validation/SKILL.md`,
        "# API Validation Skill",
      );

      const projectLayer = testProjectRepositoryLayer({
        projects: [
          {
            id: "test-project",
            claudeProjectPath: "/path/to/project",
            lastModifiedAt: new Date(),
            meta: {
              projectName: "Test Project",
              projectPath: projectDir,
              sessionCount: 0,
            },
          },
        ],
      });

      const appContextLayer = Layer.succeed(
        ApplicationContext,
        ApplicationContext.of({
          claudeCodePaths: Effect.succeed({
            globalClaudeDirectoryPath: testDir,
            claudeCommandsDirPath: globalCommandsDir,
            claudeSkillsDirPath: globalSkillsDir,
            claudeAgentsDirPath: `${testDir}/agents`,
            claudeProjectsDirPath: `${testDir}/projects`,
          }),
        }),
      );

      // Mock ClaudeCodeService with runSkillsDirectly enabled
      const testClaudeCodeServiceWithSkillsLayer = Layer.succeed(
        ClaudeCodeService,
        ClaudeCodeService.of({
          getClaudeCodeMeta: () =>
            Effect.succeed({
              claudeCodeExecutablePath: "/mock/claude",
              claudeCodeVersion: null,
            }),
          getAvailableFeatures: () =>
            Effect.succeed({
              canUseTool: false,
              uuidOnSDKMessage: false,
              agentSdk: false,
              sidechainSeparation: false,
              runSkillsDirectly: true, // Enable the flag
            }),
          getMcpList: () => Effect.succeed([]),
        }),
      );

      const controllerLayer = ClaudeCodeController.Live.pipe(
        Layer.provide(testClaudeCodeServiceWithSkillsLayer),
        Layer.provide(projectLayer),
        Layer.provide(appContextLayer),
        Layer.provide(NodeContext.layer),
        Layer.provide(testPlatformLayer()),
      );

      const controller = yield* ClaudeCodeController.pipe(Effect.provide(controllerLayer));
      const result = yield* controller
        .getClaudeCommands({
          projectId: "test-project",
        })
        .pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer()));

      expect(result.status).toBe(200);

      // Verify global skills are detected
      expect(result.response.globalSkillsLegacy).toHaveLength(3);
      expect(result.response.globalSkillsLegacy).toContain("typescript");
      expect(result.response.globalSkillsLegacy).toContain("react");
      expect(result.response.globalSkillsLegacy).toContain("frontend:design");

      // Verify project skills are detected
      expect(result.response.projectSkillsLegacy).toHaveLength(2);
      expect(result.response.projectSkillsLegacy).toContain("custom-impl");
      expect(result.response.projectSkillsLegacy).toContain("api:validation");

      // Commands should still be empty in this test
      expect(result.response.globalCommandsLegacy).toEqual([]);
      expect(result.response.projectCommandsLegacy).toEqual([]);
    }).pipe(Effect.provide(NodeContext.layer), Effect.provide(testPlatformLayer())),
  );
});
