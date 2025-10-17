import { Hono } from "hono";
import type { Config } from "../lib/config/config";

export type HonoContext = {
  Variables: {
    config: Config;
  };
};

export const honoApp = new Hono<HonoContext>().basePath("/api");

export type HonoAppType = typeof honoApp;
