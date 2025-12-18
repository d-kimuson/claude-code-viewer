import type { FC } from "react";
import { useState } from "react";
import { useBrowserPreview } from "@/hooks/useBrowserPreview";

import { SessionPageMainWrapper } from "./SessionPageMainWrapper";
import type { Tab } from "./sessionSidebar/schema";

export const SessionPageContent: FC<{
  projectId: string;
  sessionId?: string;
  tab: Tab;
}> = ({ projectId, sessionId, tab }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { previewUrl, previewWidth } = useBrowserPreview();

  const mainContentWidth = previewUrl ? 100 - previewWidth : 100;

  return (
    <div
      className="flex h-screen max-h-screen overflow-hidden transition-all duration-200"
      style={{ width: `${mainContentWidth}%` }}
    >
      <SessionPageMainWrapper
        projectId={projectId}
        sessionId={sessionId}
        tab={tab}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
      />
    </div>
  );
};
