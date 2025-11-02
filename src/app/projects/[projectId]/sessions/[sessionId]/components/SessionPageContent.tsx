import type { FC } from "react";
import { Suspense, useState } from "react";

import { Loading } from "@/components/Loading";
import { SessionPageMainWrapper } from "./SessionPageMainWrapper";
import type { Tab } from "./sessionSidebar/schema";

export const SessionPageContent: FC<{
  projectId: string;
  sessionId: string;
  tab: Tab;
}> = ({ projectId, sessionId, tab }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
      <Suspense fallback={<Loading />}>
        <SessionPageMainWrapper
          projectId={projectId}
          sessionId={sessionId}
          tab={tab}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />
      </Suspense>
    </div>
  );
};
