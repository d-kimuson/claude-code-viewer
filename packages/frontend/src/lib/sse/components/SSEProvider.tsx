import type { FC, PropsWithChildren } from "react";
import { ServerEventsProvider } from "./ServerEventsProvider";

export const SSEProvider: FC<PropsWithChildren> = ({ children }) => {
  return <ServerEventsProvider>{children}</ServerEventsProvider>;
};
