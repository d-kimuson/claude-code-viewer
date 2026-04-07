/**
 * Checks that the current Node.js version satisfies the minimum requirement.
 *
 * drizzle-orm's node-sqlite adapter uses StatementSync.setReturnArrays(),
 * which is only available in Node.js >=24.0.0 or >=22.16.0.
 * Node.js v23.x does NOT have this API.
 *
 * @see https://nodejs.org/api/sqlite.html#statementsetreturnarraysenabled
 */
export const checkNodeVersion = (): void => {
  const [majorStr, minorStr] = process.version.slice(1).split(".");
  const major = Number(majorStr);
  const minor = Number(minorStr);

  const isSupported = (major === 22 && minor >= 16) || major >= 24;

  if (!isSupported) {
    process.stderr.write(
      `Error: claude-code-viewer requires Node.js >=22.16.0 or >=24.0.0, but you are running ${process.version}.\n` +
        `Node.js v23.x is not supported because it lacks the StatementSync.setReturnArrays() API.\n` +
        `Please upgrade your Node.js version.\n`,
    );
    process.exit(1);
  }
};
