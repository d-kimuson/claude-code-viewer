import { z } from "zod";

export const BaseEntrySchema = z.object({
  // required
  isSidechain: z.boolean(),
  userType: z.enum(["external"]),
  cwd: z.string(),
  sessionId: z.string(),
  version: z.string(),
  uuid: z.uuid(),
  timestamp: z.string(),

  // nullable
  parentUuid: z.uuid().nullable(),

  // optional
  isMeta: z.boolean().optional(),
  toolUseResult: z.unknown().optional(), // スキーマがツールごとに異なりすぎるし利用もしなそうなので unknown
  gitBranch: z.string().optional(),
  isCompactSummary: z.boolean().optional(),
});
