import { describe, expect, test } from "vitest";
import { getBasePathFromDocumentUrl, toBasePathUrl } from "@/web/lib/basePath";

describe("browser base path", () => {
  test("reads the base path from a document base URL", () => {
    expect(getBasePathFromDocumentUrl("https://example.com/ccv/")).toBe("/ccv");
    expect(getBasePathFromDocumentUrl("https://example.com/")).toBe("/");
  });

  test("builds root-relative application URLs", () => {
    expect(toBasePathUrl("/ccv", "/api/sse")).toBe("/ccv/api/sse");
    expect(toBasePathUrl("/", "/api/sse")).toBe("/api/sse");
  });
});
