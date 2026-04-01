import type { FC, PropsWithChildren } from "react";
import { ServerEventsProvider } from "./ServerEventsProvider.tsx";

export const SSEProvider: FC<PropsWithChildren> = ({ children }) => {
  return <ServerEventsProvider>{children}</ServerEventsProvider>;
};
