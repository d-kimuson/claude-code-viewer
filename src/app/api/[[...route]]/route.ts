import { handle } from "hono/vercel";
import { honoApp } from "../../../server/hono/app";
import { routes } from "../../../server/hono/route";

await routes(honoApp);

export const GET = handle(honoApp);
export const POST = handle(honoApp);
export const PUT = handle(honoApp);
export const PATCH = handle(honoApp);
export const DELETE = handle(honoApp);
