const safeSegment = /^[A-Za-z0-9_~-](?:[A-Za-z0-9._~-]*[A-Za-z0-9_~-])?$/u;

export const normalizeBasePath = (input: string | undefined): string => {
  const trimmed = input?.trim() ?? "";
  if (trimmed === "" || trimmed === "/") return "/";
  if (trimmed.includes("\\") || trimmed.includes("?") || trimmed.includes("#")) {
    throw new Error(`Invalid base path: ${trimmed}`);
  }

  const withoutOuterSlashes = trimmed.replace(/^\/+|\/+$/gu, "");
  const segments = withoutOuterSlashes.split("/");
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === ".." || !safeSegment.test(segment))
  ) {
    throw new Error(`Invalid base path: ${trimmed}`);
  }

  return `/${segments.join("/")}`;
};

export const getBasePathHref = (basePath: string): string =>
  basePath === "/" ? "/" : `${basePath}/`;

export const joinBasePath = (basePath: string, path: string): string => {
  if (!path.startsWith("/")) {
    throw new Error(`Base-path child must start with /: ${path}`);
  }
  return basePath === "/" ? path : `${basePath}${path}`;
};

export const stripBasePath = (path: string, basePath: string): string | undefined => {
  if (basePath === "/") return path;
  if (path === basePath) return "/";
  if (!path.startsWith(`${basePath}/`)) return undefined;
  return path.slice(basePath.length);
};
