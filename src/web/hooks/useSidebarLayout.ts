import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SidebarLayout } from "@/lib/sidebar-layout/schema";
import { honoClient } from "@/web/lib/api/client";
import { sidebarLayoutQuery } from "@/web/lib/api/queries";
export const useSidebarLayout = () => {
  const client = useQueryClient();
  const query = useQuery(sidebarLayoutQuery);
  const mutation = useMutation({
    mutationKey: ["sidebar-layout"],
    scope: { id: "sidebar-layout" },
    mutationFn: async (layout: SidebarLayout) => {
      const response = await honoClient.api["sidebar-layout"].$put({ json: layout });
      if (!response.ok) {
        const body: unknown = await response.json();
        if (
          typeof body === "object" &&
          body !== null &&
          "message" in body &&
          typeof body.message === "string"
        )
          throw new Error(body.message);
        throw new Error(
          `Sidebar layout request failed (HTTP ${response.status}): ${JSON.stringify(body)}`,
        );
      }
      return response.json();
    },
    onMutate: async (layout) => {
      await client.cancelQueries({ queryKey: sidebarLayoutQuery.queryKey });
      const previous = client.getQueryData<SidebarLayout>(sidebarLayoutQuery.queryKey);
      client.setQueryData(sidebarLayoutQuery.queryKey, layout);
      return { previous };
    },
    onError: (error, _layout, context) => {
      if (context?.previous !== undefined)
        client.setQueryData(sidebarLayoutQuery.queryKey, context.previous);
      toast.error(error.message);
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: sidebarLayoutQuery.queryKey });
    },
  });
  return { ...query, updateLayout: mutation.mutate, isSaving: mutation.isPending };
};
