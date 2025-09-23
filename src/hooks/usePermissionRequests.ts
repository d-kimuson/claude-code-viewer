"use client";

import { useCallback, useState } from "react";
import { useServerEventListener } from "@/lib/sse/hook/useServerEventListener";
import type {
  PermissionRequest,
  PermissionResponse,
} from "@/types/permissions";

export const usePermissionRequests = () => {
  const [currentPermissionRequest, setCurrentPermissionRequest] =
    useState<PermissionRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Listen for permission requests from the server
  useServerEventListener("permission_requested", (data) => {
    if (data.permissionRequest) {
      setCurrentPermissionRequest(data.permissionRequest);
      setIsDialogOpen(true);
    }
  });

  const handlePermissionResponse = useCallback(
    async (response: PermissionResponse) => {
      try {
        const apiResponse = await fetch("/api/tasks/permission-response", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(response),
        });

        if (!apiResponse.ok) {
          throw new Error("Failed to send permission response");
        }

        // Close the dialog
        setIsDialogOpen(false);
        setCurrentPermissionRequest(null);
      } catch (error) {
        console.error("Error sending permission response:", error);
        // TODO: Show error toast to user
      }
    },
    [],
  );

  return {
    currentPermissionRequest,
    isDialogOpen,
    onPermissionResponse: handlePermissionResponse,
  };
};
