import type { FC } from "react";
import { stripAnsiSgr } from "@/lib/ansi/parseAnsiIntensity";
import { AnsiText } from "@/web/app/projects/[projectId]/sessions/[sessionId]/components/conversationList/AnsiText";
import { CopyableContent } from "@/web/app/projects/[projectId]/sessions/[sessionId]/components/conversationList/CopyableContent";

export const CopyableAnsiText: FC<{
  text: string;
  placement?: "user" | "assistant";
}> = ({ text, placement = "assistant" }) => (
  <CopyableContent content={stripAnsiSgr(text)} placement={placement}>
    <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words">
      <AnsiText text={text} />
    </pre>
  </CopyableContent>
);
