import { getBasePathHref } from "../../lib/base-path/basePath.ts";

const BASE_HREF_MARKER = '<base href="./" />';

export const injectBasePath = (html: string, basePath: string): string => {
  if (!html.includes(BASE_HREF_MARKER)) {
    throw new Error("Static index.html is missing the base href marker");
  }
  return html.replace(BASE_HREF_MARKER, `<base href="${getBasePathHref(basePath)}" />`);
};
