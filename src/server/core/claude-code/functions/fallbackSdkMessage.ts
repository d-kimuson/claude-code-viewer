import type {
  SDKMessage as AgentSDKMessage,
  ModelUsage,
  SDKHookResponseMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage as ClaudeCodeSDKMessage } from "@anthropic-ai/claude-code";

export const fallbackSdkMessage = (
  message: AgentSDKMessage | ClaudeCodeSDKMessage,
): AgentSDKMessage => {
  if (message.type === "system") {
    if (message.subtype === "init") {
      return {
        ...message,
        plugins: [],
      };
    }

    if (message.subtype === "hook_response") {
      return {
        ...message,
      } as SDKHookResponseMessage;
    }

    return message;
  }

  if (message.type === "result") {
    if (message.subtype === "success") {
      return {
        ...message,
        modelUsage: {
          ...message.modelUsage,
        } as Record<string, ModelUsage>,
      };
    }

    return {
      ...message,
      errors: [],
      modelUsage: {
        ...message.modelUsage,
      } as Record<string, ModelUsage>,
    };
  }

  return message;
};
