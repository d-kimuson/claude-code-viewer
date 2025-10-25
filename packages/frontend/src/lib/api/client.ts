import type { RouteType } from "@claude-code-viewer/backend/types";
import { hc } from "hono/client";

export const honoClient = hc<RouteType>("/");
