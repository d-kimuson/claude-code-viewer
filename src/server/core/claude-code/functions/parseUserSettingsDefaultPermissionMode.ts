import { z } from "zod";
import { permissionModeSchema } from "../schema.ts";

const userSettingsSchema = z
  .object({
    permissions: z
      .object({
        defaultMode: permissionModeSchema.optional().catch(undefined),
      })
      .optional()
      .catch(undefined),
  })
  .catch({});

export const parseUserSettingsDefaultPermissionMode = (content: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = undefined;
  }

  return userSettingsSchema.parse(parsed).permissions?.defaultMode;
};
