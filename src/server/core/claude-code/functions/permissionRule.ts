import picomatch from "picomatch";

type ParsedRule = {
  readonly toolPattern: string;
  readonly specifier: string | undefined;
};

const FILE_PATH_TOOLS = ["Edit", "Write", "Read", "MultiEdit"] as const;

const isFilePathTool = (toolName: string): boolean =>
  FILE_PATH_TOOLS.some((t) => t.toLowerCase() === toolName.toLowerCase());

/**
 * Parse a permission rule string into its tool pattern and optional specifier.
 * Examples:
 *   "Bash" → { toolPattern: "Bash", specifier: undefined }
 *   "Bash(git status)" → { toolPattern: "Bash", specifier: "git status" }
 */
export const parsePermissionRule = (rule: string): ParsedRule => {
  const parenIndex = rule.indexOf("(");
  if (parenIndex === -1) {
    return { toolPattern: rule, specifier: undefined };
  }
  const toolPattern = rule.slice(0, parenIndex);
  // Strip the trailing ")"
  const specifier = rule.slice(parenIndex + 1, -1);
  return { toolPattern, specifier };
};

/**
 * Generate a permission rule string from a tool invocation.
 */
export const generatePermissionRule = (
  toolName: string,
  toolInput: Record<string, unknown>,
  projectCwd: string,
): string => {
  if (toolName.toLowerCase() === "bash") {
    const command = toolInput["command"];
    if (typeof command === "string" && command.length > 0) {
      return `${toolName}(${command})`;
    }
    return toolName;
  }

  if (isFilePathTool(toolName)) {
    const filePath = toolInput["file_path"];
    if (typeof filePath === "string" && filePath.length > 0) {
      if (filePath.startsWith(projectCwd + "/")) {
        // File is inside project - make path relative to project root
        const relativePath = filePath.slice(projectCwd.length);
        return `${toolName}(${relativePath})`;
      }
      // File is outside project - use double slash prefix
      return `${toolName}(/${filePath})`;
    }
    return toolName;
  }

  // MCP tools and other generic tools: return tool name only
  return toolName;
};

const getSpecifierValue = (
  toolName: string,
  toolInput: Record<string, unknown>,
): string | undefined => {
  if (toolName.toLowerCase() === "bash") {
    const command = toolInput["command"];
    return typeof command === "string" ? command : undefined;
  }

  if (isFilePathTool(toolName)) {
    const filePath = toolInput["file_path"];
    if (typeof filePath === "string") {
      return filePath;
    }
    return undefined;
  }

  return undefined;
};

/**
 * Relativize a file path for matching against a rule specifier.
 * Specifiers starting with "/" are relative to project root.
 * Specifiers starting with "//" are absolute paths (strip one "/").
 */
const relativizeFilePath = (filePath: string, projectCwd: string): string => {
  if (filePath.startsWith(projectCwd + "/")) {
    return filePath.slice(projectCwd.length);
  }
  // Outside project - prefix with "/" to get double-slash form
  return `/${filePath}`;
};

/**
 * Match a permission rule against a tool invocation.
 */
export const matchPermissionRule = (
  rule: string,
  toolName: string,
  toolInput: Record<string, unknown>,
  projectCwd: string,
): boolean => {
  const parsed = parsePermissionRule(rule);

  // Check tool name match (with glob support for MCP wildcards)
  const toolMatches = picomatch.isMatch(toolName, parsed.toolPattern, {
    nocase: true,
  });
  if (!toolMatches) {
    return false;
  }

  // No specifier means match all invocations of this tool
  if (parsed.specifier === undefined || parsed.specifier === "*") {
    return true;
  }

  // For file path tools, relativize and match
  if (isFilePathTool(toolName)) {
    const filePath = toolInput["file_path"];
    if (typeof filePath !== "string") {
      return false;
    }
    const relativized = relativizeFilePath(filePath, projectCwd);
    return picomatch.isMatch(relativized, parsed.specifier, { dot: true });
  }

  // For Bash and other tools, match the specifier value directly
  const value = getSpecifierValue(toolName, toolInput);
  if (value === undefined) {
    return false;
  }

  return picomatch.isMatch(value, parsed.specifier);
};

/**
 * Check if any rule in the list matches the tool invocation.
 */
export const matchAnyRule = (
  rules: readonly string[],
  toolName: string,
  toolInput: Record<string, unknown>,
  projectCwd: string,
): boolean => rules.some((rule) => matchPermissionRule(rule, toolName, toolInput, projectCwd));
