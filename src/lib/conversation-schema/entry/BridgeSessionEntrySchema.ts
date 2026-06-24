import { z } from "zod";

// "bridge-session" entries link a local session to a remote-control bridge
// session (Claude Code v2.1.156+), enabling continuation on phone or web.
export const BridgeSessionEntrySchema = z.object({
  type: z.literal("bridge-session"),
  sessionId: z.string(),
  bridgeSessionId: z.string(),
  lastSequenceNum: z.number().optional(),
});

export type BridgeSessionEntry = z.infer<typeof BridgeSessionEntrySchema>;
