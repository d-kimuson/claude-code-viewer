import { joinBasePath, normalizeBasePath } from "@/lib/base-path/basePath";

export const getBasePathFromDocumentUrl = (documentUrl: string): string =>
  normalizeBasePath(new URL(documentUrl).pathname);

export const getBrowserBasePath = (): string =>
  typeof document === "undefined" ? "/" : getBasePathFromDocumentUrl(document.baseURI);

export const toBasePathUrl = (basePath: string, path: string): string =>
  joinBasePath(basePath, path);
