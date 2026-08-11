import type { FC } from "react";
import { MarkdownContent } from "@/web/app/components/MarkdownContent";
import { CopyableContent } from "@/web/app/projects/[projectId]/sessions/[sessionId]/components/conversationList/CopyableContent";

type CopyableMarkdownContentProps = {
  content: string;
  className?: string;
  placement?: "user" | "assistant";
};

export const CopyableMarkdownContent: FC<CopyableMarkdownContentProps> = ({
  content,
  className,
  placement = "user",
}) => (
  <CopyableContent content={content} placement={placement}>
    <MarkdownContent content={content} className={className} />
  </CopyableContent>
);
