import { z } from "zod";

const errorBodySchema = z.object({ error: z.string() });

const readErrorMessage = async (response: Response): Promise<string | undefined> => {
  try {
    const parsed = errorBodySchema.safeParse(await response.json());
    return parsed.success ? parsed.data.error : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Turn a failed login response into an Error carrying a message the login page can display.
 */
export const assertLoginSucceeded = async (response: Response): Promise<void> => {
  if (response.ok) return;

  const message = (await readErrorMessage(response)) ?? `Login failed (${response.status})`;
  const retryAfter = response.headers.get("Retry-After");
  if (response.status === 429 && retryAfter !== null) {
    throw new Error(`${message}. Try again in ${retryAfter} seconds.`);
  }
  throw new Error(message);
};
