import { createFileRoute } from "@tanstack/react-router";
import { ActivityFeed } from "../app/activity/ActivityFeed";

export const Route = createFileRoute("/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <div className="min-h-screen bg-background">
      <ActivityFeed />
    </div>
  );
}
