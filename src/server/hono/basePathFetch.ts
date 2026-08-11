import { stripBasePath } from "../../lib/base-path/basePath.ts";

type FetchHandler<Environment> = (
  request: Request,
  environment?: Environment,
) => Response | Promise<Response>;

export const createBasePathFetch =
  <Environment>(basePath: string, handler: FetchHandler<Environment>): FetchHandler<Environment> =>
  async (request, environment) => {
    const url = new URL(request.url);
    const strippedPath = stripBasePath(url.pathname, basePath);
    if (strippedPath === undefined) {
      return new Response("Not Found", { status: 404 });
    }

    if (strippedPath === url.pathname) {
      return handler(request, environment);
    }

    url.pathname = strippedPath;
    return handler(new Request(url, request), environment);
  };
