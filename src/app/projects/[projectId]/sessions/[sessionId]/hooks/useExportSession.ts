import { useMutation } from "@tanstack/react-query";
import { honoClient } from "@/lib/api/client";

export const useExportSession = () => {
  return useMutation({
    mutationFn: async (params: { projectId: string; sessionId: string }) => {
      const response = await honoClient.api.projects[":projectId"].sessions[
        ":sessionId"
      ].export.$get({
        param: {
          projectId: params.projectId,
          sessionId: params.sessionId,
        },
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data, variables) => {
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `claude-session-${variables.sessionId}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
};
