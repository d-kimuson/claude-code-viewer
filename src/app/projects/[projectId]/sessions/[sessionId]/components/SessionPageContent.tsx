import type { FC } from "react";
import { useState } from "react";

import { SessionPageMainWrapper } from "./SessionPageMainWrapper";
import type { Tab } from "./sessionSidebar/schema";

export const SessionPageContent: FC<{
  projectId: string;
  sessionId?: string;
  tab: Tab;
}> = ({ projectId, sessionId, tab }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
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
