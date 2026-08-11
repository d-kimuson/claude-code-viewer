import { describe, expect, test } from "vitest";
import { injectBasePath } from "./injectBasePath";

describe("injectBasePath", () => {
  test("replaces the document base href", () => {
    expect(injectBasePath('<head><base href="./" /></head>', "/docs/ccv")).toBe(
      '<head><base href="/docs/ccv/" /></head>',
    );
  });

  test("keeps the root href", () => {
    expect(injectBasePath('<base href="./" />', "/")).toBe('<base href="/" />');
  });

  test("fails when the build output is missing the injection marker", () => {
    expect(() => injectBasePath("<head></head>", "/ccv")).toThrow("base href marker");
  });
});
