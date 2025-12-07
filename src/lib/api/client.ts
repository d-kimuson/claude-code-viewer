import { hc } from "hono/client";
import type { RouteType } from "../../server/hono/route";

type Fetch = typeof fetch;

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(`HttpError: ${status} ${statusText}`);
  }
}

const customFetch: Fetch = async (...args) => {
  const response = await fetch(...args);
  if (!response.ok) {
    console.error(response);
    throw new HttpError(response.status, response.statusText);
  }
  return response;
};

export const honoClient = hc<RouteType>("/", {
  fetch: customFetch,
});
