/**
 * Checks that the current Node.js version satisfies the minimum requirement.
 *
 * drizzle-orm's node-sqlite adapter uses StatementSync.setReturnArrays(),
 * which is only available in Node.js >=24.0.0.
 *
 * @see https://nodejs.org/api/sqlite.html#statementsetreturnarraysenabled
 */
export const checkNodeVersion = (): void => {
  const majorStr = process.version.slice(1).split(".")[0];
  const major = Number(majorStr);

  if (major < 24) {
    process.stderr.write(
      `Error: claude-code-viewer requires Node.js >=24.0.0, but you are running ${process.version}.\n` +
        `Please upgrade your Node.js version.\n`,
    );
    process.exit(1);
  }
};
