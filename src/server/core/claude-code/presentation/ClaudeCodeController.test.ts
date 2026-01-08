import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import { testProjectRepositoryLayer } from "../../../../testing/layers/testProjectRepositoryLayer";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import { ClaudeCodeService } from "../services/ClaudeCodeService";
import { ClaudeCodeController } from "./ClaudeCodeController";

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
      }).pipe(
        Effect.provide(NodeContext.layer),
        Effect.provide(testPlatformLayer()),
      ),
    );

    testDir = result.tmpDir;
    globalCommandsDir = result.globalDir;
    projectDir = result.projectDir;
    projectCommandsDir = result.projectCommandsDir;
  });

  afterEach(async () => {
    // Cleanup is handled by scoped temp directory
  });

  it("should return flat structure commands from global and project directories", async () => {
    // Setup: Create flat command files
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        // Global commands
        yield* fs.writeFileString(`${globalCommandsDir}/impl.md`, "# Impl");
        yield* fs.writeFileString(`${globalCommandsDir}/review.md`, "# Review");

        // Project commands
        yield* fs.writeFileString(
          `${projectCommandsDir}/deploy.md`,
          "# Deploy",
        );
      }).pipe(
        Effect.provide(NodeContext.layer),
        Effect.provide(testPlatformLayer()),
      ),
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
          claudeProjectsDirPath: `${testDir}/projects`,
        }),
      }),
    );

    const testLayer = ClaudeCodeController.Live.pipe(
      Layer.provide(testClaudeCodeServiceLayer),
      Layer.provide(projectLayer),
      Layer.provide(appContextLayer),
      Layer.provide(NodeContext.layer),
      Layer.provide(testPlatformLayer()),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const controller = yield* ClaudeCodeController;
        return yield* controller
          .getClaudeCommands({
            projectId: "test-project",
          })
          .pipe(
            Effect.provide(NodeContext.layer),
            Effect.provide(testPlatformLayer()),
          );
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe(200);
    expect(result.response.globalCommands).toHaveLength(2);
    expect(result.response.globalCommands).toContain("impl");
    expect(result.response.globalCommands).toContain("review");
    expect(result.response.projectCommands).toHaveLength(1);
    expect(result.response.projectCommands).toContain("deploy");
    expect(result.response.globalSkills).toEqual([]);
    expect(result.response.projectSkills).toEqual([]);
    expect(result.response.defaultCommands).toEqual([
      "init",
      "compact",
      "security-review",
      "review",
    ]);
  });

  it("should return subdirectory commands with colon-separated names", async () => {
    // Setup: Create subdirectory command files
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        // Global commands with subdirectories
        yield* fs.makeDirectory(`${globalCommandsDir}/frontend`, {
          recursive: true,
        });
        yield* fs.writeFileString(
          `${globalCommandsDir}/frontend/impl.md`,
          "# Frontend Impl",
        );
        yield* fs.writeFileString(
          `${globalCommandsDir}/frontend/review.md`,
          "# Frontend Review",
        );
        yield* fs.writeFileString(
          `${globalCommandsDir}/backend.md`,
          "# Backend",
        );

        // Project commands with subdirectories
        yield* fs.makeDirectory(`${projectCommandsDir}/api`, {
          recursive: true,
        });
        yield* fs.writeFileString(
          `${projectCommandsDir}/api/create.md`,
          "# API Create",
        );
      }).pipe(
        Effect.provide(NodeContext.layer),
        Effect.provide(testPlatformLayer()),
      ),
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
          claudeProjectsDirPath: `${testDir}/projects`,
        }),
      }),
    );

    const testLayer = ClaudeCodeController.Live.pipe(
      Layer.provide(testClaudeCodeServiceLayer),
      Layer.provide(projectLayer),
      Layer.provide(appContextLayer),
      Layer.provide(NodeContext.layer),
      Layer.provide(testPlatformLayer()),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const controller = yield* ClaudeCodeController;
        return yield* controller
          .getClaudeCommands({
            projectId: "test-project",
          })
          .pipe(
            Effect.provide(NodeContext.layer),
            Effect.provide(testPlatformLayer()),
          );
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe(200);
    expect(result.response.globalCommands).toHaveLength(3);
    expect(result.response.globalCommands).toContain("backend");
    expect(result.response.globalCommands).toContain("frontend:impl");
    expect(result.response.globalCommands).toContain("frontend:review");
    expect(result.response.projectCommands).toHaveLength(1);
    expect(result.response.projectCommands).toContain("api:create");
    expect(result.response.globalSkills).toEqual([]);
    expect(result.response.projectSkills).toEqual([]);
  });

  it("should return deeply nested commands with multiple colons", async () => {
    // Setup: Create deeply nested command files
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        yield* fs.makeDirectory(
          `${globalCommandsDir}/frontend/components/buttons`,
          { recursive: true },
        );
        yield* fs.writeFileString(
          `${globalCommandsDir}/frontend/components/buttons/primary.md`,
          "# Primary Button",
        );
      }).pipe(
        Effect.provide(NodeContext.layer),
        Effect.provide(testPlatformLayer()),
      ),
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
          claudeProjectsDirPath: `${testDir}/projects`,
        }),
      }),
    );

    const testLayer = ClaudeCodeController.Live.pipe(
      Layer.provide(testClaudeCodeServiceLayer),
      Layer.provide(projectLayer),
      Layer.provide(appContextLayer),
      Layer.provide(NodeContext.layer),
      Layer.provide(testPlatformLayer()),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const controller = yield* ClaudeCodeController;
        return yield* controller
          .getClaudeCommands({
            projectId: "test-project",
          })
          .pipe(
            Effect.provide(NodeContext.layer),
            Effect.provide(testPlatformLayer()),
          );
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe(200);
    expect(result.response.globalCommands).toHaveLength(1);
    expect(result.response.globalCommands).toContain(
      "frontend:components:buttons:primary",
    );
    expect(result.response.globalSkills).toEqual([]);
    expect(result.response.projectSkills).toEqual([]);
  });

  it("should return empty arrays when command directories do not exist", async () => {
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
          claudeProjectsDirPath: `${testDir}/projects`,
        }),
      }),
    );

    const testLayer = ClaudeCodeController.Live.pipe(
      Layer.provide(testClaudeCodeServiceLayer),
      Layer.provide(projectLayer),
      Layer.provide(appContextLayer),
      Layer.provide(NodeContext.layer),
      Layer.provide(testPlatformLayer()),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const controller = yield* ClaudeCodeController;
        return yield* controller
          .getClaudeCommands({
            projectId: "test-project",
          })
          .pipe(
            Effect.provide(NodeContext.layer),
            Effect.provide(testPlatformLayer()),
          );
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe(200);
    expect(result.response.globalCommands).toEqual([]);
    expect(result.response.projectCommands).toEqual([]);
    expect(result.response.globalSkills).toEqual([]);
    expect(result.response.projectSkills).toEqual([]);
  });

  it("should return empty project commands when projectPath is null", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(`${globalCommandsDir}/impl.md`, "# Impl");
      }).pipe(
        Effect.provide(NodeContext.layer),
        Effect.provide(testPlatformLayer()),
      ),
    );

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
          claudeProjectsDirPath: `${testDir}/projects`,
        }),
      }),
    );

    const testLayer = ClaudeCodeController.Live.pipe(
      Layer.provide(testClaudeCodeServiceLayer),
      Layer.provide(projectLayer),
      Layer.provide(appContextLayer),
      Layer.provide(NodeContext.layer),
      Layer.provide(testPlatformLayer()),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const controller = yield* ClaudeCodeController;
        return yield* controller
          .getClaudeCommands({
            projectId: "test-project",
          })
          .pipe(
            Effect.provide(NodeContext.layer),
            Effect.provide(testPlatformLayer()),
          );
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe(200);
    expect(result.response.globalCommands).toHaveLength(1);
    expect(result.response.globalCommands).toContain("impl");
    expect(result.response.projectCommands).toEqual([]);
    expect(result.response.globalSkills).toEqual([]);
    expect(result.response.projectSkills).toEqual([]);
  });

  it("should exclude hidden files and directories from command list", async () => {
    // Setup: Create commands including hidden files
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        yield* fs.writeFileString(
          `${globalCommandsDir}/visible.md`,
          "# Visible",
        );
        yield* fs.writeFileString(
          `${globalCommandsDir}/.hidden.md`,
          "# Hidden",
        );
        yield* fs.makeDirectory(`${globalCommandsDir}/.hidden-dir`, {
          recursive: true,
        });
        yield* fs.writeFileString(
          `${globalCommandsDir}/.hidden-dir/impl.md`,
          "# Hidden Impl",
        );
      }).pipe(
        Effect.provide(NodeContext.layer),
        Effect.provide(testPlatformLayer()),
      ),
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
          claudeProjectsDirPath: `${testDir}/projects`,
        }),
      }),
    );

    const testLayer = ClaudeCodeController.Live.pipe(
      Layer.provide(testClaudeCodeServiceLayer),
      Layer.provide(projectLayer),
      Layer.provide(appContextLayer),
      Layer.provide(NodeContext.layer),
      Layer.provide(testPlatformLayer()),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const controller = yield* ClaudeCodeController;
        return yield* controller
          .getClaudeCommands({
            projectId: "test-project",
          })
          .pipe(
            Effect.provide(NodeContext.layer),
            Effect.provide(testPlatformLayer()),
          );
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.status).toBe(200);
    expect(result.response.globalCommands).toHaveLength(1);
    expect(result.response.globalCommands).toContain("visible");
    expect(result.response.globalCommands).not.toContain(".hidden");
    expect(result.response.globalCommands).not.toContain(".hidden-dir:impl");
    expect(result.response.globalSkills).toEqual([]);
    expect(result.response.projectSkills).toEqual([]);
  });
});
