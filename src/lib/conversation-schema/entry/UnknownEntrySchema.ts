import { z } from "zod";

// Catch-all for session-log entry types the viewer does not model yet.
//
// Claude Code keeps adding small metadata entries to the session jsonl
// (`atis-latch`, `history-suppression`, `frame-link`, `file-history-delta`,
// `artifact-*`, `cost-state`, ...). They carry no conversation content, but
// every new one failed `ConversationSchema` and surfaced as a
// "Schema Validation Error" banner until a dedicated schema landed
// (#210–#213, #231, #234). This schema accepts any entry whose `type` is NOT
// one of the modelled types and normalises it into a single, typed
// `unknown-entry` shape, so the rest of the app keeps a finite `type` union.
//
// Known types are deliberately excluded: a *malformed* entry of a modelled
// type must still fail validation, otherwise real schema drift would be
// hidden behind this fallback.
export const createUnknownEntrySchema = (knownTypes: ReadonlySet<string>) =>
  z
    .looseObject({
      type: z.string().refine((type) => !knownTypes.has(type), {
        message: "known entry types must match their own schema",
      }),
    })
    .transform(({ type, ...rest }) => ({
      type: "unknown-entry" as const,
      originalType: type,
      sessionId: typeof rest.sessionId === "string" ? rest.sessionId : undefined,
      raw: rest,
    }));

export type UnknownEntry = z.infer<ReturnType<typeof createUnknownEntrySchema>>;
