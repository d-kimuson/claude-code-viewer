import type { FC } from "react";
import { useMemo } from "react";
import { extractLatestTodos } from "@/lib/todo-viewer";
import { useSession } from "../../projects/[projectId]/sessions/[sessionId]/hooks/useSession";
import { CollapsibleTodoSection } from "./common/CollapsibleTodoSection";

// Separate component that uses useSession hook - only rendered when sessionId exists
export const ReviewTodoSection: FC<{
  projectId: string;
  sessionId: string;
}> = ({ projectId, sessionId }) => {
  const { conversations } = useSession(projectId, sessionId);
  const latestTodos = useMemo(
    () => extractLatestTodos(conversations),
    [conversations],
  );
  return <CollapsibleTodoSection todos={latestTodos} />;
};
