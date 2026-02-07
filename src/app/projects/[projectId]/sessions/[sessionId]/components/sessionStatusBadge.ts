type SessionStatus = "paused" | "running" | undefined;

type SessionStatusBadgeProps = {
  labelId: "session.status.running" | "session.status.paused";
  className: string;
  icon: "paused" | "running";
};

export const getSessionStatusBadgeProps = (
  status: SessionStatus,
): SessionStatusBadgeProps | undefined => {
  if (status === "running") {
    return {
      labelId: "session.status.running",
      className:
        "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
      icon: "running",
    };
  }

  if (status === "paused") {
    return {
      labelId: "session.status.paused",
      className:
        "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
      icon: "paused",
    };
  }

  return undefined;
};
