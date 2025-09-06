"use client";

import type { FC } from "react";
import { SettingsControls } from "@/components/SettingsControls";

export const SettingsTab: FC<{
  openingProjectId: string;
}> = ({ openingProjectId }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-sidebar-border p-4">
        <h2 className="font-semibold text-lg">Settings</h2>
        <p className="text-xs text-sidebar-foreground/70">
          Display and behavior preferences
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Session Display Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-sidebar-foreground">
            Session Display
          </h3>

          <SettingsControls openingProjectId={openingProjectId} />
        </div>
      </div>
    </div>
  );
};
