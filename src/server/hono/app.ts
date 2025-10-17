import { Hono } from "hono";
import type { UserConfig } from "../lib/config/config";

export type HonoContext = {
  Variables: {
    userConfig: UserConfig;
  };
};

export const honoApp = new Hono<HonoContext>().basePath("/api");

export type HonoAppType = typeof honoApp;
