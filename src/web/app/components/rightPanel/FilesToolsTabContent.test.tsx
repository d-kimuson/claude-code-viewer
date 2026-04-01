// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmptyFilesToolsTabContent, FilesToolsTabContent } from "./FilesToolsTabContent";

type QueryState = {
  data?: {
    agentSessions: readonly {
      agentId: string;
      firstMessage: string | null;
    }[];
  };
  isPending: boolean;
  error: null;
  refetch: () => void;
};

const mockExtractAllEditedFiles = vi.fn((_conversations: unknown) => []);
const mockExtractToolCalls = vi.fn((_conversations: unknown) => []);
const mockExtractLatestTodos = vi.fn((_conversations: unknown) => []);
const mockUseSession = vi.fn((_projectId: string, _sessionId: string) => ({
  conversations: [],
}));

let queryState: QueryState = {
  data: {
    agentSessions: [],
  },
  isPending: false,
  error: null,
  refetch: vi.fn(),
};

vi.mock("@lingui/react", () => ({
  Trans: ({ id }: { id?: string }) => <>{id ?? ""}</>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => queryState,
}));

vi.mock("@/web/lib/api/queries", () => ({
  agentSessionListQuery: () => ({
    queryKey: ["agent-sessions"],
    queryFn: () => ({
      agentSessions: [],
    }),
  }),
  agentSessionQuery: () => ({
    queryKey: ["agent-session"],
    queryFn: () => ({
      conversations: [],
    }),
  }),
}));

vi.mock("@/lib/file-viewer", () => ({
  extractAllEditedFiles: (conversations: unknown) => mockExtractAllEditedFiles(conversations),
  extractToolCalls: (conversations: unknown) => mockExtractToolCalls(conversations),
}));

vi.mock("@/lib/todo-viewer", () => ({
  extractLatestTodos: (conversations: unknown) => mockExtractLatestTodos(conversations),
}));

vi.mock("../../projects/[projectId]/sessions/[sessionId]/hooks/useSession", () => ({
  useSession: (projectId: string, sessionId: string) => mockUseSession(projectId, sessionId),
}));

vi.mock(
  "../../projects/[projectId]/sessions/[sessionId]/components/conversationList/ConversationList",
  () => ({
    ConversationList: () => <div>ConversationList</div>,
  }),
);

vi.mock(
  "../../projects/[projectId]/sessions/[sessionId]/components/conversationList/FileContentDialog",
  () => ({
    FileContentDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }),
);

vi.mock("./common/CollapsibleTodoSection", () => ({
  CollapsibleTodoSection: () => <div>TodoSection</div>,
}));

vi.mock("@/web/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/web/components/ui/checkbox", () => ({
  Checkbox: () => <input type="checkbox" readOnly />,
}));

vi.mock("@/web/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/web/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("FilesToolsTabContent", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  const renderComponent = () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<FilesToolsTabContent projectId="test-project" sessionId="test-session" />);
    });
  };

  beforeEach(() => {
    queryState = {
      data: {
        agentSessions: [],
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    };
    mockExtractAllEditedFiles.mockReturnValue([]);
    mockExtractToolCalls.mockReturnValue([]);
    mockExtractLatestTodos.mockReturnValue([]);
    mockUseSession.mockReturnValue({
      conversations: [],
    });
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
    vi.clearAllMocks();
  });

  it("shows empty messages for each explorer section", () => {
    renderComponent();

    expect(container?.textContent).toContain("panel.files.edited_section");
    expect(container?.textContent).toContain("panel.files.tool_calls_section");
    expect(container?.textContent).toContain("Agents");
    expect(container?.textContent).not.toContain("panel.files.no_edited_files");
    expect(container?.textContent).not.toContain("panel.files.no_tool_calls");
    expect(container?.textContent).not.toContain("panel.files.no_agents");
  });

  it("shows a loading message while agent sessions are pending", () => {
    queryState = {
      data: undefined,
      isPending: true,
      error: null,
      refetch: vi.fn(),
    };

    renderComponent();

    expect(container?.textContent).not.toContain("panel.files.loading_agents");
    expect(container?.textContent).not.toContain("panel.files.no_agents");
  });

  it("shows explorer placeholders for a new session without session data", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(<EmptyFilesToolsTabContent />);
    });

    expect(container?.textContent).toContain("session.empty_state.description");
    expect(container?.textContent).not.toContain("panel.files.no_edited_files");
    expect(container?.textContent).not.toContain("panel.files.no_tool_calls");
    expect(container?.textContent).not.toContain("panel.files.no_agents");
  });
});
