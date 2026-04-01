// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatInput, type ChatInputProps } from "./ChatInput";

vi.mock("@lingui/react", () => ({
  Trans: ({ id, message }: { id?: string; message?: string }) => <>{message ?? id ?? ""}</>,
  useLingui: () => ({
    i18n: {
      _: (input: string | { id?: string; message?: string }) =>
        typeof input === "string" ? input : (input.message ?? input.id ?? ""),
    },
  }),
}));

vi.mock("../../../../hooks/useConfig", () => ({
  useConfig: () => ({
    config: {
      enterKeyBehavior: "shift-enter-send",
      modelChoices: ["default"],
    },
  }),
}));

vi.mock("../../../../../hooks/useScheduler", () => ({
  useCreateSchedulerJob: () => ({
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("../../../../../hooks/useSpeechRecognition", () => ({
  useSpeechRecognition: () => ({
    isSupported: false,
    isListening: false,
    audioLevels: [0, 0, 0, 0],
    toggle: vi.fn(),
  }),
}));

vi.mock("@/lib/atoms/chatInputDrafts", () => ({
  useChatInputDraft: () => {
    const setValue = vi.fn();
    const clearValue = vi.fn();
    return ["", setValue, clearValue];
  },
}));

vi.mock("./InlineCompletion", () => ({
  InlineCompletion: () => null,
}));

describe("ChatInput", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  const renderComponent = (props?: Partial<ChatInputProps>) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const defaultProps: ChatInputProps = {
      projectId: "test-project",
      onSubmit: async () => {},
      isPending: false,
      placeholder: "Type your message...",
      buttonText: "Send",
    };

    act(() => {
      root?.render(<ChatInput {...defaultProps} {...props} />);
    });
  };

  const getTextarea = () => {
    const textarea = container?.querySelector("textarea");
    expect(textarea).not.toBeNull();
    if (textarea === null || textarea === undefined) {
      throw new Error("Textarea not found");
    }
    return textarea;
  };

  const dispatchPasteEvent = ({ items, files }: { items: unknown[]; files: File[] }) => {
    const event = new Event("paste", {
      bubbles: true,
      cancelable: true,
    });

    Object.defineProperty(event, "clipboardData", {
      value: {
        items,
        files,
      },
    });

    act(() => {
      getTextarea().dispatchEvent(event);
    });

    return event;
  };

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    vi.clearAllMocks();
  });

  it("attaches pasted clipboard images", () => {
    renderComponent();

    const imageFile = new File(["image"], "clipboard-image.png", {
      type: "image/png",
    });

    const event = dispatchPasteEvent({
      items: [
        {
          kind: "file",
          type: "image/png",
          getAsFile: () => imageFile,
        },
      ],
      files: [imageFile],
    });

    expect(event.defaultPrevented).toBe(true);
    expect(container?.textContent).toContain("clipboard-image.png");
  });

  it("ignores non-image clipboard content", () => {
    renderComponent();

    const event = dispatchPasteEvent({
      items: [
        {
          kind: "string",
          type: "text/plain",
          getAsFile: () => null,
        },
      ],
      files: [],
    });

    expect(event.defaultPrevented).toBe(false);
    expect(container?.textContent).not.toContain("clipboard-image.png");
  });

  it("should have correct type definition for enableScheduledSend", () => {
    const props: ChatInputProps = {
      projectId: "test-project",
      onSubmit: async () => {},
      isPending: false,
      placeholder: "Type your message...",
      buttonText: "Send",
      enableScheduledSend: true,
      baseSessionId: null,
    };

    expect(props.enableScheduledSend).toBe(true);
    expect(props.baseSessionId).toBe(null);
  });

  it("should allow enableScheduledSend to be undefined", () => {
    const props: ChatInputProps = {
      projectId: "test-project",
      onSubmit: async () => {},
      isPending: false,
      placeholder: "Type your message...",
      buttonText: "Send",
    };

    expect(props.enableScheduledSend).toBeUndefined();
  });

  it("should allow baseSessionId to be a string", () => {
    const props: ChatInputProps = {
      projectId: "test-project",
      onSubmit: async () => {},
      isPending: false,
      placeholder: "Type your message...",
      buttonText: "Send",
      baseSessionId: "session-123",
    };

    expect(props.baseSessionId).toBe("session-123");
  });
});
