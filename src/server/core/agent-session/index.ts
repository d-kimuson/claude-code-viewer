import { Layer } from "effect";
import { AgentSessionRepository } from "./infrastructure/AgentSessionRepository";
import { AgentSessionMappingService } from "./services/AgentSessionMappingService";

export { normalizePrompt } from "./functions/normalizePrompt";
export { AgentSessionRepository } from "./infrastructure/AgentSessionRepository";
export { AgentSessionController } from "./presentation/AgentSessionController";
// Barrel exports
export { AgentSessionMappingService } from "./services/AgentSessionMappingService";

// Layer composition for dependency injection
export const AgentSessionLayer = Layer.mergeAll(
  AgentSessionMappingService.Live,
  AgentSessionRepository.Live,
);
