import type { FC } from "react";
import { Suspense, useState } from "react";

import { Loading } from "@/components/Loading";
import { SessionPageMain } from "./SessionPageMain";
import { SessionSidebar } from "./sessionSidebar/SessionSidebar";

export const SessionPageContent: FC<{
  projectId: string;
  sessionId: string;
}> = ({ projectId, sessionId }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
      <SessionSidebar
        currentSessionId={sessionId}
        projectId={projectId}
        isMobileOpen={isMobileSidebarOpen}
        onMobileOpenChange={setIsMobileSidebarOpen}
      />
      <Suspense fallback={<Loading />}>
        <SessionPageMain
          projectId={projectId}
          sessionId={sessionId}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />
      </Suspense>
    </div>
  );
};
