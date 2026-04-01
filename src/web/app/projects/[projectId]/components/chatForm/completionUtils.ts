/**
 * Determines if the user is actively in a completion context
 * (i.e., the autocomplete indicator should be shown).
 *
 * @param message - The current input message
 * @returns true if actively in completion context, false otherwise
 */
export const isInCompletionContext = (message: string): boolean => {
  // Case 1: Command completion - starts with "/" and no space after
  if (message.startsWith("/") && !message.includes(" ")) {
    return true;
  }

  // Case 2: File completion - last "@" is actively being typed
  const lastAtIndex = message.lastIndexOf("@");
  if (lastAtIndex === -1) {
    return false;
  }

  // Get text after the last "@"
  const afterAt = message.slice(lastAtIndex + 1);

  // If there's a space after the path, completion is done
  // This includes cases like "@file.ts " or "@file.ts and more text"
  const hasSpaceAfterPath = afterAt.includes(" ");

  return !hasSpaceAfterPath;
};
