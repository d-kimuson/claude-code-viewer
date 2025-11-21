/**
 * Determines if a filename represents a regular session file.
 * Regular session files end with .jsonl but do NOT start with "agent-".
 *
 * @param filename - The filename to check (e.g., "session-id.jsonl", "agent-abc123.jsonl")
 * @returns true if the file is a regular session file, false otherwise
 */
export const isRegularSessionFile = (filename: string): boolean =>
  filename.endsWith(".jsonl") && !filename.startsWith("agent-");
