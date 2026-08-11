import { toBasePathUrl } from "@/web/lib/basePath";

export const buildWebSocketUrl = (
  origin: string,
  basePath: string,
  sessionId: string | undefined,
  cwd: string | undefined,
): string => {
  const url = new URL(toBasePathUrl(basePath, "/ws/terminal"), origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (sessionId !== undefined && sessionId !== "") {
    url.searchParams.set("sessionId", sessionId);
  }
  if (cwd !== undefined && cwd !== "") {
    url.searchParams.set("cwd", cwd);
  }
  return url.href;
};
