import { Layer } from "effect";
import { AgentSessionRepository } from "./infrastructure/AgentSessionRepository.ts";

export { AgentSessionRepository } from "./infrastructure/AgentSessionRepository.ts";
export { AgentSessionController } from "./presentation/AgentSessionController.ts";

// Layer composition for dependency injection
// Note: AgentSessionMappingService is no longer used since agentId-based lookup
// replaced the session-id x prompt mapping approach
export const AgentSessionLayer = Layer.mergeAll(AgentSessionRepository.Live);
