import type { SDKMessage as AgentSDKMessage } from "@anthropic-ai/claude-agent-sdk";
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

    return message;
  }

  if (message.type === "result") {
    if (message.subtype === "success") {
      return {
        ...message,
      };
    }

    return {
      ...message,
      errors: [],
    };
  }

  return message;
};
