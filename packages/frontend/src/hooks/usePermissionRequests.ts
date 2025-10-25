import type {
  PermissionRequest,
  PermissionResponse,
} from "@claude-code-viewer/shared/types/permissions";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useServerEventListener } from "@/lib/sse/hook/useServerEventListener";
import { honoClient } from "../lib/api/client";

export const usePermissionRequests = () => {
  const [currentPermissionRequest, setCurrentPermissionRequest] =
    useState<PermissionRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Listen for permission requests from the server
  useServerEventListener("permissionRequested", (data) => {
    if (data.permissionRequest) {
      setCurrentPermissionRequest(data.permissionRequest);
      setIsDialogOpen(true);
    }
  });

  const handlePermissionResponse = useCallback(
    async (response: PermissionResponse) => {
      try {
        const apiResponse = await honoClient.api.cc[
          "permission-response"
        ].$post({
          json: response,
        });

        if (!apiResponse.ok) {
          throw new Error("Failed to send permission response");
        }

        // Close the dialog
        setIsDialogOpen(false);
        setCurrentPermissionRequest(null);
      } catch (error) {
        console.error("Error sending permission response:", error);
        toast.error("Failed to send permission response");
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
