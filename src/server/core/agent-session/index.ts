import { Layer } from "effect";
import { AgentSessionRepository } from "./infrastructure/AgentSessionRepository";

export { AgentSessionRepository } from "./infrastructure/AgentSessionRepository";
export { AgentSessionController } from "./presentation/AgentSessionController";

// Layer composition for dependency injection
// Note: AgentSessionMappingService is no longer used since agentId-based lookup
// replaced the session-id x prompt mapping approach
export const AgentSessionLayer = Layer.mergeAll(AgentSessionRepository.Live);
