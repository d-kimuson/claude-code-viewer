#!/usr/bin/env node
import { Command } from "commander";
import { Effect } from "effect";
import packageJson from "../../package.json" with { type: "json" };
import type { CliOptions } from "./core/platform/services/CcvOptionsService";
import { checkDeprecatedEnvs } from "./core/platform/services/DeprecatedEnvDetector";
import { startServer } from "./startServer";

const program = new Command();

program
  .name(packageJson.name)
  .version(packageJson.version)
  .description(packageJson.description);

// start server
program
  .option("-p, --port <port>", "port to listen on")
  .option("-h, --hostname <hostname>", "hostname to listen on")
  .option("-P, --password <password>", "password to authenticate")
  .option("-e, --executable <executable>", "path to claude code executable")
  .option("--claude-dir <claude-dir>", "path to claude directory")
  .action(async (options: CliOptions) => {
    // Check for deprecated environment variables and show migration guide
    await Effect.runPromise(checkDeprecatedEnvs);

    await startServer(options);
  });

/* Other Commands Here */

const main = async () => {
  program.parse(process.argv);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
