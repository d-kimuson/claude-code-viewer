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
      const safeSessionId =
        variables.sessionId.replace(/[^a-zA-Z0-9._-]/g, "_") || "unknown";
      const file = new File(
        [data.html],
        `ccv-html-export-${safeSessionId}.html`,
        { type: "text/html" },
      );
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.rel = "noopener";
      link.target = "_self";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
      }, 1000);
    },
  });
};
