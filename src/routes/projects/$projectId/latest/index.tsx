import { Trans } from "@lingui/react";
import {
  createFileRoute,
  useLoaderData,
  useRouter,
} from "@tanstack/react-router";
import { NotFound } from "../../../../components/NotFound";
import { honoClient } from "../../../../lib/api/client";

export const Route = createFileRoute("/projects/$projectId/latest/")({
  component: RouteComponent,
  notFoundComponent: () => (
    <NotFound
      message={
        <Trans id="notfound.project.title" message="Project Not Found" />
      }
      description={
        <Trans
          id="notfound.project.description"
          message="The project you are looking for does not exist."
        />
      }
    />
  ),
  loader: async ({ params }) => {
    const { projectId } = params;
    const response = await honoClient.api.projects[":projectId"][
      "latest-session"
    ].$get({
      param: { projectId },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Failed to fetch latest session: ${response.statusText}`,
      } as const;
    }

    return {
      success: true,
      projectId,
      data: await response.json(),
    } as const;
  },
});

function RouteComponent() {
  const router = useRouter();
  const loaderData = useLoaderData({ from: "/projects/$projectId/latest/" });

  if (!loaderData.success) {
    return <div>{loaderData.message}</div>;
  }

  const latestSession = loaderData.data.latestSession;
  if (latestSession === null) {
    router.navigate({ to: "/projects" });
    return null;
  }

  router.navigate({
    to: "/projects/$projectId/sessions/$sessionId",
    params: {
      projectId: loaderData.projectId,
      sessionId: latestSession.id,
    },
  });
  return null;
}
