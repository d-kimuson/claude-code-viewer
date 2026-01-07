import { Trans } from "@lingui/react";
import { Clock } from "lucide-react";
import type { FC } from "react";
import { formatDuration } from "@/lib/date/formatDuration";

type TurnDurationProps = {
  durationMs: number;
};

export const TurnDuration: FC<TurnDurationProps> = ({ durationMs }) => {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 px-2">
      <Clock className="h-3 w-3" />
      <span>
        <Trans id="assistant.turn_duration" />: {formatDuration(durationMs)}
      </span>
    </div>
  );
};
